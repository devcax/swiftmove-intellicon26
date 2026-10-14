import { request } from '@/shared/api/client';
import type { NotificationInbox } from './types';

export const fetchNotifications = (signal?: AbortSignal) => request<NotificationInbox>('/api/notifications', { signal });
export const readNotifications = (input: { id: string } | { through: string }) =>
  request<{ ok: boolean }>('/api/notifications/read', { method: 'POST', body: JSON.stringify(input) });
