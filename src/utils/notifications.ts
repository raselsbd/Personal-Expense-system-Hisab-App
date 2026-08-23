import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function initNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Hisab Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  deadlineIso: string,
  minutesBefore: number
): Promise<string | null> {
  const deadline = new Date(deadlineIso);
  const triggerDate = new Date(deadline.getTime() - minutesBefore * 60 * 1000);
  if (triggerDate.getTime() <= Date.now()) return null;

  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Deadline soon',
      body: `"${title}" deadline is approaching`,
      data: { taskId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function schedulePaymentDueReminder(
  projectId: string,
  projectName: string,
  dueDateIso: string // yyyy-MM-dd
): Promise<string | null> {
  const triggerDate = new Date(`${dueDateIso}T10:00:00`);
  if (triggerDate.getTime() <= Date.now()) return null;

  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Payment due',
      body: `Payment for "${projectName}" is due today`,
      data: { projectId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function scheduleLoanDueReminder(
  loanId: string,
  personName: string,
  direction: 'lent' | 'borrowed',
  dueDateIso: string // yyyy-MM-dd
): Promise<string | null> {
  const dueDate = new Date(`${dueDateIso}T10:00:00`);
  const triggerDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
  if (triggerDate.getTime() <= Date.now()) return null;

  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: direction === 'lent' ? 'Repayment due tomorrow' : 'You owe a repayment tomorrow',
      body:
        direction === 'lent'
          ? `${personName} is due to repay you tomorrow`
          : `Your repayment to ${personName} is due tomorrow`,
      data: { loanId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function sendImmediateAlert(title: string, body: string): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
