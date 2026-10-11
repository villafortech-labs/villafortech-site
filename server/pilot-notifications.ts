import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { z } from 'zod';
import { pilot, roles, goals } from '../src/data/pilot.ts';
import {
  isTestApplication,
  type StoredApplication,
  type NotificationState,
} from './pilot-review.ts';

const RECIPIENT = 'villafortech@gmail.com';
const SENDER = 'Villa for Tech <aplicaciones@avisos.villafortech.com>';
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1_000;
const LEASE_MS = 90_000;
const payloadSchema = z.object({
  from: z.literal(SENDER),
  to: z.tuple([z.literal(RECIPIENT)]),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});
const recordSchema = z.object({
  version: z.literal(1),
  applicationId: z.uuid(),
  status: z.enum(['pending', 'sent', 'failed']),
  updatedAt: z.iso.datetime(),
  firstAttemptAt: z.iso.datetime(),
  leaseUntil: z.iso.datetime().optional(),
  uncertainSince: z.iso.datetime().optional(),
  attempts: z.number().int().nonnegative(),
  reason: z.string().optional(),
  httpStatus: z.number().int().optional(),
  messageId: z.string().optional(),
  payload: payloadSchema,
});
export type NotificationRecord = z.infer<typeof recordSchema>;
type Snapshot = { record: NotificationRecord | null; etag: string | null };
export class NotificationConflictError extends Error {}
export class NotificationStorageError extends Error {
  constructor() {
    super('No se pudo guardar el estado del aviso.');
  }
}
export type NotificationStore = {
  read: (id: string) => Promise<Snapshot>;
  write: (
    id: string,
    record: NotificationRecord,
    etag: string | null,
  ) => Promise<void>;
};
type Config = { apiKey?: string; reviewUrl?: string };
type Options = {
  store: NotificationStore;
  config: () => Config;
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
};
function validConfig(config: Config) {
  if (!config.apiKey?.trim() || !config.reviewUrl?.trim()) return false;
  try {
    const url = new URL(config.reviewUrl);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      config.reviewUrl.length <= 2_048
    );
  } catch {
    return false;
  }
}
function publicState(record: NotificationRecord): NotificationState {
  return {
    status: record.status,
    updatedAt: record.updatedAt,
    ...(record.messageId ? { messageId: record.messageId } : {}),
    ...(record.reason ? { reason: record.reason } : {}),
    ...(record.httpStatus ? { httpStatus: record.httpStatus } : {}),
  };
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
}
function field(value: unknown, fallback = 'No indicado') {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 500)
    : fallback;
}
function makePayload(
  application: StoredApplication,
  reviewUrl: string,
): NotificationRecord['payload'] {
  const name = field(application.name);
  const email = field(application.email);
  const area =
    roles.find((role) => role.value === application.role)?.label ??
    field(application.role);
  const goal =
    goals.find((goal) => goal.value === application.goal)?.label ??
    field(application.goal);
  return {
    from: SENDER,
    to: [RECIPIENT],
    subject: `${isTestApplication(application) ? '[PRUEBA] ' : ''}Nueva aplicación · Segundo cerebro`,
    text: `Nueva aplicación recibida.\n\nNombre: ${name}\nCorreo: ${email}\nÁrea: ${area}\nObjetivo: ${goal}\n\nRevisa las respuestas y selecciona a las cinco personas:\n${reviewUrl}\n\nEste aviso es privado y no se envió a quien aplicó.`,
    html: `<h1>Nueva aplicación recibida</h1><p><strong>Nombre:</strong> ${escapeHtml(name)}<br><strong>Correo:</strong> ${escapeHtml(email)}<br><strong>Área:</strong> ${escapeHtml(area)}<br><strong>Objetivo:</strong> ${escapeHtml(goal)}</p><p><a href="${escapeHtml(reviewUrl)}">Revisar respuestas y selección</a></p><p>Este aviso es privado y no se envió a quien aplicó.</p>`,
  };
}
function failureReason(status: number) {
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  if (status === 401) return 'authentication';
  if (status === 403) return 'domain_or_permission';
  if (status === 409) return 'idempotency_conflict';
  if (status === 400 || status === 422) return 'validation';
  return 'api_error';
}

export function createPilotNotifications(options: Options) {
  const {
    store,
    config,
    fetch: send = globalThis.fetch,
    now = () => new Date(),
    sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  } = options;
  const configured = () => validConfig(config());
  async function read(id: string) {
    try {
      return await store.read(id);
    } catch {
      throw new NotificationStorageError();
    }
  }
  async function write(
    id: string,
    record: NotificationRecord,
    etag: string | null,
  ) {
    try {
      await store.write(id, record, etag);
    } catch (error) {
      if (error instanceof NotificationConflictError) throw error;
      throw new NotificationStorageError();
    }
  }
  async function notifyApplication(
    application: StoredApplication,
  ): Promise<NotificationState> {
    if (!z.uuid().safeParse(application.id).success)
      throw new Error('Identificador de aplicación inválido.');
    const settings = config();
    if (!validConfig(settings)) return { status: 'unconfigured' };
    let claimed: NotificationRecord | undefined;
    let previousUncertain = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const snapshot = await read(application.id);
      const prior = snapshot.record;
      if (prior?.status === 'sent') return publicState(prior);
      const current = now();
      if (
        prior?.status === 'pending' &&
        prior.leaseUntil &&
        Date.parse(prior.leaseUntil) > current.getTime()
      )
        return publicState(prior);
      if (
        prior?.uncertainSince &&
        current.getTime() - Date.parse(prior.uncertainSince) >= RETRY_WINDOW_MS
      ) {
        const blocked: NotificationRecord = {
          ...prior,
          status: 'failed',
          reason: 'delivery_unknown',
          updatedAt: current.toISOString(),
        };
        await write(application.id, blocked, snapshot.etag);
        return publicState(blocked);
      }
      claimed = {
        version: 1,
        applicationId: application.id,
        status: 'pending',
        firstAttemptAt: prior?.firstAttemptAt ?? current.toISOString(),
        updatedAt: current.toISOString(),
        leaseUntil: new Date(current.getTime() + LEASE_MS).toISOString(),
        attempts: prior?.attempts ?? 0,
        // Keep the exact payload across retries, including deployment URL changes.
        payload:
          prior?.payload ?? makePayload(application, settings.reviewUrl!),
        // Claim and uncertainty are durable before contacting the provider.
        uncertainSince: prior?.uncertainSince ?? current.toISOString(),
      };
      try {
        await write(application.id, claimed, snapshot.etag);
        previousUncertain = Boolean(prior?.uncertainSince);
        break;
      } catch (error) {
        claimed = undefined;
        if (!(error instanceof NotificationConflictError)) throw error;
      }
    }
    if (!claimed) throw new NotificationStorageError();
    const sending = claimed;
    let result: NotificationRecord = {
      ...sending,
      status: 'failed',
      reason: 'network',
    };
    let uncertain = previousUncertain;
    for (let attempt = 0; attempt < 3; attempt++) {
      let retryable = false;
      const attempts = claimed.attempts + attempt + 1;
      try {
        const response = await send('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `pilot-application/${application.id}`,
          },
          body: JSON.stringify(claimed.payload),
          signal: AbortSignal.timeout(8_000),
        });
        if (response.ok) {
          const body: unknown = await response.json();
          const parsed = z
            .object({ id: z.string().min(1).max(200) })
            .safeParse(body);
          if (!parsed.success) {
            uncertain = true;
            result = {
              ...sending,
              status: 'failed',
              attempts,
              reason: 'invalid_response',
              httpStatus: response.status,
            };
          } else {
            result = {
              ...sending,
              status: 'sent',
              attempts,
              messageId: parsed.data.id,
            };
          }
          break;
        }
        await response.body?.cancel();
        retryable = response.status === 429 || response.status >= 500;
        if (response.status >= 500) uncertain = true;
        result = {
          ...sending,
          status: 'failed',
          attempts,
          reason: failureReason(response.status),
          httpStatus: response.status,
        };
      } catch {
        uncertain = true;
        retryable = true;
        result = { ...sending, status: 'failed', attempts, reason: 'network' };
      }
      if (!retryable || attempt === 2) break;
      await sleep(1_000 * 2 ** attempt);
    }
    delete result.leaseUntil;
    if (!uncertain || result.status === 'sent') delete result.uncertainSince;
    result.updatedAt = now().toISOString();
    const latest = await read(application.id);
    if (latest.record?.status === 'sent') return publicState(latest.record);
    await write(application.id, result, latest.etag);
    return publicState(result);
  }
  async function getNotificationStates(
    ids: string[],
  ): Promise<Record<string, NotificationState>> {
    const selected = [...new Set(ids)]
      .slice(0, 50)
      .filter((id) => z.uuid().safeParse(id).success);
    const entries: Array<[string, NotificationState]> = [];
    for (let start = 0; start < selected.length; start += 4) {
      const group = await Promise.all(
        selected.slice(start, start + 4).map(async (id) => {
          const { record } = await read(id);
          return record
            ? ([id, publicState(record)] as [string, NotificationState])
            : null;
        }),
      );
      for (const entry of group) if (entry) entries.push(entry);
    }
    return Object.fromEntries(entries);
  }
  return {
    notifyApplication,
    getNotificationStates,
    notificationsConfigured: configured,
  };
}

function pathname(id: string) {
  if (!z.uuid().safeParse(id).success)
    throw new Error('Identificador de aplicación inválido.');
  return `pilot-notifications/${pilot.id}/${id}.json`;
}
const blobStore: NotificationStore = {
  async read(id) {
    const result = await get(pathname(id), {
      access: 'private',
      useCache: false,
    });
    if (!result) return { record: null, etag: null };
    if (result.statusCode !== 200) throw new NotificationStorageError();
    const record = recordSchema.parse(await new Response(result.stream).json());
    if (record.applicationId !== id) throw new NotificationStorageError();
    return { record, etag: result.blob.etag };
  },
  async write(id, record, etag) {
    recordSchema.parse(record);
    try {
      await put(pathname(id), JSON.stringify(record), {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json',
        ...(etag
          ? { allowOverwrite: true, ifMatch: etag }
          : { allowOverwrite: false }),
      });
    } catch (error) {
      if (
        error instanceof BlobPreconditionFailedError ||
        (etag === null && (await blobStore.read(id)).etag)
      )
        throw new NotificationConflictError();
      throw error;
    }
  },
};
const service = createPilotNotifications({
  store: blobStore,
  config: () => ({
    apiKey: process.env.RESEND_API_KEY,
    reviewUrl: process.env.PILOT_REVIEW_URL,
  }),
});
export const notifyApplication = service.notifyApplication;
export const getNotificationStates = service.getNotificationStates;
export const notificationsConfigured = service.notificationsConfigured;
