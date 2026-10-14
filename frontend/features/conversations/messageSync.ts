import type { ChatMessage } from './types';

/** A poll begun before a send (or clear/delete) cannot overwrite the newer local state. */
export function createMessageSync() {
  const threads = new Map<string, { revision: number; request: number; sending: boolean }>();
  const state = (id: string) => {
    let entry = threads.get(id);
    if (!entry) { entry = { revision: 0, request: 0, sending: false }; threads.set(id, entry); }
    return entry;
  };
  return {
    beginRead(id: string) {
      const entry = state(id);
      if (entry.sending) return null;
      return { revision: entry.revision, request: ++entry.request };
    },
    canApply(id: string, token: { revision: number; request: number }) {
      const entry = state(id);
      return !entry.sending && entry.revision === token.revision && entry.request === token.request;
    },
    beginSend(id: string) {
      const entry = state(id);
      if (entry.sending) return false;
      entry.revision += 1;
      entry.sending = true;
      return true;
    },
    finishSend(id: string) { const entry = state(id); entry.revision += 1; entry.sending = false; },
    invalidate(id: string) { state(id).revision += 1; },
  };
}

/** Replace by server id without remounting the bubble, including a poll that already saw the saved row. */
export function acknowledgeMessage(messages: ChatMessage[], localId: string, saved: ChatMessage) {
  const replacement = { ...saved, clientId: localId };
  const next = messages.filter(message => message.id !== saved.id || message.id === localId);
  return next.some(message => message.id === localId)
    ? next.map(message => message.id === localId ? replacement : message)
    : [...next, replacement];
}

/** Failed, unsaved replies remain visible; saved messages use server data and retain their render identity. */
export function reconcileMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const existing = new Map(current.map(message => [message.id, message]));
  return [
    ...incoming.map(message => ({ ...message, clientId: existing.get(message.id)?.clientId })),
    ...current.filter(message => message.id.startsWith('local-') && !incoming.some(item => item.id === message.id)),
  ];
}
