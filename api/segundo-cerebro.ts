import { put } from '@vercel/blob';
import { waitUntil } from '@vercel/functions';
import {
  notifyApplication,
  logNotificationError,
} from '../server/pilot-notifications.ts';
import { createPilotHandler } from '../server/pilot.ts';
import { pilotPreviewOrigins } from '../server/pilot-origins.ts';

export default {
  fetch: createPilotHandler({
    allowedOrigins: pilotPreviewOrigins({
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    }),
    afterSave(application) {
      waitUntil(
        notifyApplication(application).catch((error: unknown) =>
          logNotificationError('background', error),
        ),
      );
    },
    async save(application) {
      await put(
        `${application.pilotId}/${application.id}.json`,
        JSON.stringify(application),
        {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: 'application/json',
        },
      );
    },
  }),
};
