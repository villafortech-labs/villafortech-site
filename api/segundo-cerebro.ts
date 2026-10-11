import { put } from '@vercel/blob';
import { waitUntil } from '@vercel/functions';
import {
  notifyApplication,
  logNotificationError,
} from '../server/pilot-notifications.ts';
import { createPilotHandler } from '../server/pilot.ts';

const previewOrigin =
  process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? [`https://${process.env.VERCEL_URL}`]
    : [];

export default {
  fetch: createPilotHandler({
    allowedOrigins: previewOrigin,
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
