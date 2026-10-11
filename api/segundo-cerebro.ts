import { waitUntil } from '@vercel/functions';
import {
  notifyApplication,
  logNotificationError,
} from '../server/pilot-notifications.ts';
import { createPilotHandler } from '../server/pilot.ts';
import { pilotPreviewOrigins } from '../server/pilot-origins.ts';
import { createSecurityCheck } from '../server/pilot-security.ts';
import {
  createDeduplicatingSave,
  dedupStore,
  rateStore,
} from '../server/pilot-security-store.ts';

const allowedOrigins = pilotPreviewOrigins({
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
});

export default {
  fetch: createPilotHandler({
    allowedOrigins,
    checkSecurity: createSecurityCheck({
      secret: process.env.TURNSTILE_SECRET_KEY,
      allowedOrigins,
      rateStore,
    }),
    afterSave(application) {
      waitUntil(
        notifyApplication(application).catch((error: unknown) =>
          logNotificationError('background', error),
        ),
      );
    },
    save: createDeduplicatingSave(
      dedupStore,
      process.env.PILOT_DEDUP_SECRET,
      JSON.parse(process.env.PILOT_LEGACY_APPLICATION_IDS ?? '{}') as Record<
        string,
        string
      >,
    ),
  }),
};
