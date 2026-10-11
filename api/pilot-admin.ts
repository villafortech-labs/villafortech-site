import {
  notifyApplication,
  getNotificationStates,
  notificationsConfigured,
  logNotificationError,
} from '../server/pilot-notifications.ts';
import { createPilotAdminHandler } from '../server/pilot-review.ts';
import { createSecurityCheck } from '../server/pilot-security.ts';
import { rateStore } from '../server/pilot-security-store.ts';
import { pilotPreviewOrigins } from '../server/pilot-origins.ts';
import {
  readApplication,
  listApplications,
  readReviewState,
  writeReviewState,
} from '../server/pilot-store.ts';

export default {
  fetch: createPilotAdminHandler({
    secret: process.env.PILOT_ADMIN_SECRET,
    checkSecurity: createSecurityCheck({
      secret: process.env.TURNSTILE_SECRET_KEY,
      rateStore,
      allowedOrigins: pilotPreviewOrigins({
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
      }),
    }),
    async notify(application) {
      try {
        return await notifyApplication(application);
      } catch (error) {
        logNotificationError('admin', error);
        throw error;
      }
    },
    readNotifications: getNotificationStates,
    notificationsConfigured,
    readApplication,
    listApplications,
    readReviewState,
    writeReviewState,
  }),
};
