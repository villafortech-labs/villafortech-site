import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';
import type { SecurityCheck } from './pilot-security.ts';

export const reviewStatuses = [
  'pending',
  'shortlist',
  'selected',
  'waitlist',
  'not_selected',
] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];
export type StoredApplication = Record<string, unknown> & {
  id: string;
  name: string;
  email: string;
};
export type ReviewEntry = {
  status: ReviewStatus;
  notes: string;
  updatedAt: string | null;
  emailHash: string;
};
export type ReviewState = {
  version: 1;
  reviews: Record<string, ReviewEntry>;
};
export type ReviewSnapshot = { state: ReviewState; etag: string | null };
export type NotificationState = { status: string; [key: string]: unknown };
export type ReviewStore = {
  readApplication: (id: string) => Promise<StoredApplication | null>;
  listApplications: (cursor?: string) => Promise<{
    applications: StoredApplication[];
    nextCursor: string | null;
  }>;
  readReviewState: () => Promise<ReviewSnapshot>;
  writeReviewState: (state: ReviewState, etag: string | null) => Promise<void>;
};
export class ReviewConflictError extends Error {}

const SESSION_SECONDS = 12 * 60 * 60;
const COOKIE_NAME = '__Secure-pilot_admin';
const BODY_LIMIT = 8_192;
const MAX_SELECTED = 5;
const headers = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  Vary: 'Cookie',
};
const actionSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('login'),
      secret: z.string().max(512),
      turnstileToken: z.string().max(2048).default(''),
    })
    .strict(),
  z.object({ action: z.literal('logout') }).strict(),
  z
    .object({
      action: z.literal('review'),
      id: z.uuid(),
      status: z.enum(reviewStatuses),
      notes: z.string().trim().max(2_000),
    })
    .strict(),
  z.object({ action: z.literal('notify'), id: z.uuid() }).strict(),
]);

export function isTestApplication(application: StoredApplication): boolean {
  return /@(?:[^@.]+\.)*example\.invalid$/i.test(application.email.trim());
}
export function selectedCount(state: ReviewState): number {
  return Object.values(state.reviews).filter((r) => r.status === 'selected')
    .length;
}
export function defaultReview(): Omit<ReviewEntry, 'emailHash'> {
  return { status: 'pending', notes: '', updatedAt: null };
}
function publicReview(review?: ReviewEntry) {
  if (!review) return defaultReview();
  return {
    status: review.status,
    notes: review.notes,
    updatedAt: review.updatedAt,
  };
}
function hash(value: string) {
  return createHash('sha256').update(value).digest();
}
function cookie(value: string, maxAge = SESSION_SECONDS) {
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/api/pilot-admin; Max-Age=${maxAge}`;
}
function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
function authenticated(request: Request, secret: string, now: Date) {
  const raw = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw || raw.length > 256) return false;
  const parts = raw.split('.');
  if (parts.length !== 3) return false;
  const [expiry, nonce, signature] = parts;
  if (
    !/^\d+$/.test(expiry) ||
    !z.uuid().safeParse(nonce).success ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  )
    return false;
  const expires = Number(expiry);
  const current = Math.floor(now.getTime() / 1_000);
  if (expires <= current || expires > current + SESSION_SECONDS) return false;
  const expected = sign(`${expiry}.${nonce}`, secret);
  return (
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
function reply(status: number, message: string) {
  return Response.json({ ok: false, message }, { status, headers });
}
async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > BODY_LIMIT)
    throw new RangeError('body');
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > BODY_LIMIT) {
      await reader.cancel();
      throw new RangeError('body');
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

type Options = ReviewStore & {
  checkSecurity: SecurityCheck;
  secret?: string;
  now?: () => Date;
  notify?: (application: StoredApplication) => Promise<NotificationState>;
  readNotifications?: (
    ids: string[],
  ) => Promise<Record<string, NotificationState>>;
  notificationsConfigured?: () => boolean;
};

export function createPilotAdminHandler(options: Options) {
  const { now = () => new Date() } = options;
  return async (request: Request): Promise<Response> => {
    if (!['GET', 'POST'].includes(request.method))
      return new Response(null, {
        status: 405,
        headers: { ...headers, Allow: 'GET, POST' },
      });
    const secret = options.secret;
    if (!secret || secret.length < 32)
      return reply(503, 'El acceso privado todavía no está configurado.');
    const current = now();
    if (request.method === 'POST') {
      if (request.headers.get('origin') !== new URL(request.url).origin)
        return reply(
          403,
          'Abre el panel desde su enlace e inténtalo de nuevo.',
        );
      if (
        request.headers
          .get('content-type')
          ?.split(';')[0]
          .trim()
          .toLowerCase() !== 'application/json'
      )
        return reply(415, 'El envío debe usar JSON.');
    } else if (!authenticated(request, secret, current)) {
      return reply(401, 'Inicia sesión para revisar las aplicaciones.');
    }
    try {
      if (request.method === 'GET') {
        const cursor =
          new URL(request.url).searchParams.get('cursor') ?? undefined;
        if (cursor && cursor.length > 2_048)
          return reply(400, 'La página solicitada no es válida.');
        const [page, snapshot] = await Promise.all([
          options.listApplications(cursor),
          options.readReviewState(),
        ]);
        const configured = options.notificationsConfigured?.() ?? false;
        const notifications =
          (await options.readNotifications?.(
            page.applications.map((a) => a.id),
          )) ?? {};
        return Response.json(
          {
            applications: page.applications.map((application) => ({
              ...application,
              review: publicReview(snapshot.state.reviews[application.id]),
              isTest: isTestApplication(application),
              notification: notifications[application.id] ?? {
                status: configured ? 'pending' : 'unconfigured',
              },
            })),
            selectedCount: selectedCount(snapshot.state),
            nextCursor: page.nextCursor,
            notificationsConfigured: configured,
          },
          { headers },
        );
      }
      let data: unknown;
      try {
        data = await readBody(request);
      } catch (error) {
        return reply(
          error instanceof RangeError ? 413 : 400,
          'No se pudo leer el envío o es demasiado largo.',
        );
      }
      const parsed = actionSchema.safeParse(data);
      if (!parsed.success)
        return reply(400, 'Revisa los datos y vuelve a intentarlo.');
      const action = parsed.data;
      if (action.action === 'login') {
        const failure = await options.checkSecurity(
          request,
          action.turnstileToken,
          'pilot_admin',
        );
        if (failure)
          return Response.json(
            { ok: false, message: failure.message },
            {
              status: failure.status,
              headers: {
                ...headers,
                ...(failure.retryAfter
                  ? { 'Retry-After': String(failure.retryAfter) }
                  : {}),
              },
            },
          );
        if (!timingSafeEqual(hash(action.secret), hash(secret)))
          return reply(401, 'La clave de acceso no es válida.');
        const payload = `${Math.floor(current.getTime() / 1_000) + SESSION_SECONDS}.${randomUUID()}`;
        return Response.json(
          { ok: true },
          {
            headers: {
              ...headers,
              'Set-Cookie': cookie(`${payload}.${sign(payload, secret)}`),
            },
          },
        );
      }
      if (!authenticated(request, secret, current))
        return reply(401, 'Tu sesión venció. Vuelve a ingresar.');
      if (action.action === 'logout')
        return Response.json(
          { ok: true },
          { headers: { ...headers, 'Set-Cookie': cookie('', 0) } },
        );
      const application = await options.readApplication(action.id);
      if (!application) return reply(404, 'No se encontró esta aplicación.');
      if (action.action === 'notify') {
        if (!options.notify || !options.notificationsConfigured?.())
          return reply(
            503,
            'Los avisos por correo todavía no están configurados.',
          );
        const notification = await options.notify(application);
        return Response.json({ ok: true, notification }, { headers });
      }
      if (action.status === 'selected' && isTestApplication(application))
        return reply(
          409,
          'Las aplicaciones de prueba no pueden ocupar un cupo.',
        );
      const emailHash = hash(application.email.trim().toLowerCase()).toString(
        'hex',
      );
      for (let attempt = 0; attempt < 8; attempt++) {
        const snapshot = await options.readReviewState();
        const others = Object.entries(snapshot.state.reviews).filter(
          ([id, review]) => id !== action.id && review.status === 'selected',
        );
        if (action.status === 'selected' && others.length >= MAX_SELECTED)
          return reply(
            409,
            'Ya hay cinco personas seleccionadas. Libera un cupo antes de elegir a otra.',
          );
        if (
          action.status === 'selected' &&
          others.some(([, review]) => review.emailHash === emailHash)
        )
          return reply(
            409,
            'Este correo ya tiene una aplicación seleccionada.',
          );
        const review: ReviewEntry = {
          status: action.status,
          notes: action.notes,
          updatedAt: current.toISOString(),
          emailHash,
        };
        const state: ReviewState = {
          version: 1,
          reviews: { ...snapshot.state.reviews, [action.id]: review },
        };
        try {
          await options.writeReviewState(state, snapshot.etag);
          return Response.json(
            {
              ok: true,
              review: publicReview(review),
              selectedCount: selectedCount(state),
            },
            { headers },
          );
        } catch (error) {
          if (!(error instanceof ReviewConflictError)) throw error;
        }
      }
      return reply(
        409,
        'Otra revisión se guardó al mismo tiempo. Recarga e inténtalo de nuevo.',
      );
    } catch {
      return reply(
        503,
        'No se pudo completar la operación. Tus respuestas siguen guardadas; vuelve a intentarlo.',
      );
    }
  };
}
