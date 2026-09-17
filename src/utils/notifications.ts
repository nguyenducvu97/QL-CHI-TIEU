import { formatVND } from './bidvParser';

/**
 * Checks if browser Notification API is supported in current environment
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Returns current notification permission
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Requests browser notification permission from user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return false;
  }
};

export interface TransactionNotificationPayload {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryName?: string;
  balance?: number;
}

export interface NotificationConfig {
  notifyExpense: boolean;
  notifyIncome: boolean;
  showBalance: boolean;
  enableSound: boolean;
}

const NOTIFICATION_CONFIG_KEY = 'bidv_notification_config';

export const getNotificationConfig = (): NotificationConfig => {
  if (typeof window === 'undefined') {
    return { notifyExpense: true, notifyIncome: true, showBalance: true, enableSound: true };
  }
  try {
    const raw = localStorage.getItem(NOTIFICATION_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { notifyExpense: true, notifyIncome: true, showBalance: true, enableSound: true };
};

export const saveNotificationConfig = (config: NotificationConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_CONFIG_KEY, JSON.stringify(config));
  } catch {}
};

/**
 * Displays a system/browser notification for newly recognized BIDV transaction.
 * Uses ServiceWorkerRegistration.showNotification when available (which works
 * even when the tab is running in background or minimized on desktop/Android),
 * with fallback to new Notification().
 */
export const showTransactionNotification = async (
  payload: TransactionNotificationPayload
): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const config = getNotificationConfig();
  if (payload.type === 'expense' && !config.notifyExpense) return false;
  if (payload.type === 'income' && !config.notifyIncome) return false;

  const isExpense = payload.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const title = `${isExpense ? '💸 Chi tiêu BIDV' : '💰 Tiền vào BIDV'}: ${sign}${formatVND(payload.amount)}`;

  let body = payload.description;
  if (payload.categoryName) {
    body += ` • ${payload.categoryName}`;
  }
  if (config.showBalance && payload.balance !== undefined && payload.balance !== null) {
    body += `\n💳 Số dư: ${formatVND(payload.balance)}`;
  }

  const options: NotificationOptions & { vibrate?: number[] } = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.id ? `bidv-tx-${payload.id}` : `bidv-tx-${Date.now()}`,
    vibrate: config.enableSound ? [200, 100, 200] : undefined,
    data: {
      url: '/',
      id: payload.id,
      timestamp: Date.now(),
    },
    silent: !config.enableSound,
  };

  // 1. Try showing via Service Worker first (crucial for background tabs & Android)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification failed, using fallback:', swErr);
    }
  }

  // 2. Fallback to standard Window Notification
  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (windowErr) {
    console.warn('Window Notification failed:', windowErr);
    return false;
  }
};

/**
 * Helper to test the notification with a demo transaction
 */
export const sendTestNotification = async (): Promise<boolean> => {
  const granted = Notification.permission === 'granted' ? true : await requestNotificationPermission();
  if (!granted) return false;

  return showTransactionNotification({
    type: 'expense',
    amount: 35000,
    description: 'Highlands Coffee - Cà phê phin sữa đá',
    categoryName: 'Ăn uống & Cà phê',
    balance: 12500000,
  });
};
