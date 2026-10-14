export interface InboxNotification {
  id: string;
  notificationType: 'DRIVER_MESSAGE' | 'INCIDENT';
  title: string;
  body: string;
  severity: string;
  targetPath: string;
  createdAt: string;
  readAt: string | null;
}
export interface NotificationInbox { items: InboxNotification[]; unreadCount: number; checkedAt: string }
