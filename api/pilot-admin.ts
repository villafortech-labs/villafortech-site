import {
  notifyApplication,
  getNotificationStates,
  notificationsConfigured,
  logNotificationError,
} from '../server/pilot-notifications.ts';
import { createPilotAdminHandler } from '../server/pilot-review.ts';
import {
  readApplication,
  listApplications,
  readReviewState,
  writeReviewState,
} from '../server/pilot-store.ts';

export default {
  fetch: createPilotAdminHandler({
    secret: process.env.PILOT_ADMIN_SECRET,
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
