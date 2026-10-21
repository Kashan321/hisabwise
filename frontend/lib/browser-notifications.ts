import type { InboxNotification, InboxNotificationCategory } from '@/lib/api/types';

export function browserNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!browserNotificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!browserNotificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function shouldShowBrowserNotification(
  notification: Pick<InboxNotification, 'category'>,
  preferences: { browserEnabled: boolean; browserCategories: InboxNotificationCategory[] | null },
): boolean {
  if (!preferences.browserEnabled) return false;
  if (!preferences.browserCategories || preferences.browserCategories.length === 0) return true;
  return preferences.browserCategories.includes(notification.category);
}

export function showBrowserNotification(
  notification: Pick<InboxNotification, 'title' | 'body' | 'id'>,
  onClick?: () => void,
) {
  if (!browserNotificationsSupported() || Notification.permission !== 'granted') return;
  const n = new Notification(notification.title, {
    body: notification.body,
    tag: notification.id,
    icon: '/favicon.ico',
  });
  n.onclick = () => {
    window.focus();
    onClick?.();
    n.close();
  };
}
