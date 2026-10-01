import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const EMPATHY_REMINDER_ID = 'sway-empathy-daily';
export const CYCLE_REMINDER_ID = 'sway-cycle-daily';
const EMPATHY = { id: EMPATHY_REMINDER_ID, channel: 'empathy-reminders', name: 'Daily empathy reminders',
  title: 'A moment of care', body: 'Your daily empathy brief and micro-mission are ready. Tap to make a little room for each other.', kind: 'empathy-reminder' };
const CYCLE = { id: CYCLE_REMINDER_ID, channel: 'cycle-reminders', name: 'Daily cycle check-ins',
  title: 'A moment for yourself', body: 'Log your symptoms today and keep your cycle notes up to date.', kind: 'cycle-reminder' };
let pending: Promise<unknown> = Promise.resolve();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }),
});

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.catch(() => undefined);
  return result;
}

/** A stable identifier replaces the existing schedule rather than duplicating it. */
export function configureEmpathyReminder(enabled: boolean, hour: number, minute: number, requestPermission = false): Promise<boolean> {
  return configureDailyReminder(EMPATHY, enabled, hour, minute, requestPermission);
}

export function configureCycleReminder(enabled: boolean, hour: number, minute: number, requestPermission = false): Promise<boolean> {
  return configureDailyReminder(CYCLE, enabled, hour, minute, requestPermission);
}

function configureDailyReminder(reminder: typeof EMPATHY, enabled: boolean, hour: number, minute: number, requestPermission: boolean): Promise<boolean> {
  return serialize(async () => {
    if (Platform.OS === 'web') return !enabled;
    if (!enabled) {
      await Notifications.cancelScheduledNotificationAsync(reminder.id);
      return true;
    }
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
      throw new Error('Choose a valid reminder time.');
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(reminder.channel, {
        name: reminder.name, importance: Notifications.AndroidImportance.DEFAULT,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }
    let permission = await Notifications.getPermissionsAsync();
    const allowed = (status: Notifications.NotificationPermissionsStatus) => status.granted ||
      status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
    if (!allowed(permission) && requestPermission && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!allowed(permission)) {
      await Notifications.cancelScheduledNotificationAsync(reminder.id);
      return false;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: reminder.title,
        // Repeating content cannot recalculate a phase while the app is closed.
        body: reminder.body,
        data: { kind: reminder.kind },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: reminder.channel },
    });
    return true;
  });
}
