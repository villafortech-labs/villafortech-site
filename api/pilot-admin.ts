import {
  notifyApplication,
  getNotificationStates,
  notificationsConfigured,
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
    notify: notifyApplication,
    readNotifications: getNotificationStates,
    notificationsConfigured,
    readApplication,
    listApplications,
    readReviewState,
    writeReviewState,
  }),
};
