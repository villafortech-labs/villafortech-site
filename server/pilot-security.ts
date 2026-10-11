import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export type SecurityAction = 'pilot_apply' | 'pilot_admin';
export type SecurityFailure = {
  status: 403 | 429 | 503;
  message: string;
  retryAfter?: number;
};
export type SecurityCheck = (
  request: Request,
  token: string,
  action: SecurityAction,
) => Promise<SecurityFailure | null>;
export type RateState = { startedAt: number; count: number };
export type RateStore = {
  read: (action: SecurityAction) => Promise<{
    state: RateState | null;
    etag: string | null;
  }>;
  write: (
    action: SecurityAction,
    state: RateState,
    etag: string | null,
  ) => Promise<void>;
};
export class SecurityConflictError extends Error {}

// Shared across instances and regions. Only verified tokens consume these
// application-level budgets; the edge handles raw request floods separately.
export const ratePolicies = {
  pilot_apply: { limit: 60, windowMs: 60_000 },
  pilot_admin: { limit: 5, windowMs: 60_000 },
} as const;

export async function consumeRateLimit(
  store: RateStore,
  action: SecurityAction,
  now = Date.now(),
): Promise<number | null> {
  const policy = ratePolicies[action];
  for (let attempt = 0; attempt < 12; attempt++) {
    const snapshot = await store.read(action);
    const state =
      snapshot.state && now < snapshot.state.startedAt + policy.windowMs
        ? snapshot.state
        : { startedAt: now, count: 0 };
    if (state.count >= policy.limit)
      return Math.max(
        1,
        Math.ceil((state.startedAt + policy.windowMs - now) / 1000),
      );
    try {
      await store.write(
        action,
        { ...state, count: state.count + 1 },
        snapshot.etag,
      );
      return null;
    } catch (error) {
      if (!(error instanceof SecurityConflictError)) throw error;
    }
  }
  throw new Error('Security counter contention');
}

const validationSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
  'error-codes': z.array(z.string()).optional(),
});

export function createSecurityCheck(options: {
  secret?: string;
  allowedOrigins?: string[];
  rateStore: RateStore;
  send?: typeof fetch;
  now?: () => number;
}): SecurityCheck {
  const origins = new Set([
    'https://www.villafortech.com',
    'https://villafortech.com',
    ...(options.allowedOrigins ?? []),
  ]);
  const unavailable: SecurityFailure = {
    status: 503,
    message:
      'No pudimos comprobar la seguridad del envío. Tus datos siguen aquí; espera un momento e inténtalo de nuevo.',
    retryAfter: 30,
  };
  return async (request, token, action) => {
    // A missing configuration must never silently disable protection. Dummy
    // Turnstile keys are only used by isolated tests, never by this adapter.
    if (!options.secret || /^[123]x0{10}/.test(options.secret))
      return unavailable;
    const origin = request.headers.get('origin') ?? '';
    if (!origins.has(origin) || !token || token.length > 2048)
      return {
        status: 403,
        message: 'Completa la comprobación de seguridad e inténtalo de nuevo.',
      };
    try {
      const response = await (options.send ?? fetch)(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: options.secret,
            response: token,
            idempotency_key: randomUUID(),
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) return unavailable;
      const parsed = validationSchema.safeParse(await response.json());
      if (!parsed.success) return unavailable;
      const result = parsed.data;
      if (
        result['error-codes']?.some((code) =>
          [
            'internal-error',
            'invalid-input-secret',
            'missing-input-secret',
          ].includes(code),
        )
      )
        return unavailable;
      if (
        !result.success ||
        result.hostname !== new URL(origin).hostname ||
        result.action !== action
      )
        return {
          status: 403,
          message:
            'La comprobación de seguridad venció o no es válida. Inténtalo de nuevo.',
        };
      const retryAfter = await consumeRateLimit(
        options.rateStore,
        action,
        options.now?.(),
      );
      if (retryAfter !== null)
        return {
          status: 429,
          retryAfter,
          message:
            'Hay demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo; tus datos siguen aquí.',
        };
      return null;
    } catch {
      // Never log challenge tokens, submitted data, or provider credentials.
      return unavailable;
    }
  };
}
