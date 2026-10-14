"use client";

import * as React from 'react';
import { usePolling } from '@/shared/hooks/usePolling';
import { feedback } from '@/shared/feedback/store';
import { fetchNotifications, readNotifications } from './api';
import type { NotificationInbox } from './types';

/** Server-backed, per-user inbox. No alert flood on first load; polls pause in hidden tabs. */
export function useNotifications() {
  const [inbox, setInbox] = React.useState<NotificationInbox | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const seen = React.useRef<Set<string> | null>(null);
  const revision = React.useRef(0);
  const mutating = React.useRef(false);
  const load = React.useCallback(async (signal: AbortSignal) => {
    if (mutating.current) return;
    const started = revision.current;
    try {
      const data = await fetchNotifications(signal);
      if (signal.aborted || started !== revision.current) return;
      const fresh = seen.current ? data.items.filter(item => item.notificationType === 'INCIDENT' && !item.readAt && !seen.current!.has(item.id)) : [];
      seen.current ??= new Set();
      data.items.forEach(item => seen.current!.add(item.id));
      if (fresh.length) feedback.info(fresh.length === 1 ? fresh[0].title : `${fresh.length} new incident reports`);
      setInbox(data);
      setError(null);
    } catch {
      if (!signal.aborted) setError('Notifications could not refresh. Retrying automatically.');
    }
  }, []);
  const { refresh } = usePolling(load, 5_000);
  const markRead = async (id?: string) => {
    if (!inbox || mutating.current) return false;
    mutating.current = true;
    revision.current += 1;
    setBusy(true);
    try {
      await readNotifications(id ? { id } : { through: inbox.checkedAt });
      const readAt = new Date().toISOString();
      setInbox(current => {
        if (!current) return current;
        const count = current.items.filter(item => !item.readAt && (!id || item.id === id)).length;
        return { ...current, unreadCount: id ? Math.max(0, current.unreadCount - count) : 0,
          items: current.items.map(item => (!id || item.id === id) && !item.readAt ? { ...item, readAt } : item) };
      });
      setError(null);
      return true;
    } catch {
      feedback.error('Could not mark notifications as read. Please try again.');
      return false;
    } finally {
      mutating.current = false;
      revision.current += 1;
      setBusy(false);
      void refresh();
    }
  };
  return { inbox, error, busy, markRead, refresh };
}
