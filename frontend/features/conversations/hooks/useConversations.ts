"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { describeError } from "@/shared/api/describeError";
import { usePolling } from "@/shared/hooks/usePolling";
import { fmtClock } from "@/lib/format";
import {
  clearConversation, deleteConversation, fetchConversationMessages, fetchConversations, markConversationRead, sendManagerMessage, setConversationTakeover,
} from "../api";
import { POLL_INTERVAL_MS } from "../constants";
import type { ChatMessage, Conversation } from "../types";
import { feedback } from "@/shared/feedback/store";
import { ApiError } from "@/shared/api/client";
import { acknowledgeMessage, createMessageSync, reconcileMessages } from "../messageSync";

const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** The conversations and the open thread: refreshed every 2 seconds while the tab is visible, with the manager's actions (reply, take over, clear, delete). */
export function useConversations() {
  const searchParams = useSearchParams();
  const requestedThread = searchParams.get("conversation");
  const [threads, setThreads] = React.useState<Conversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(requestedThread);
  const [previousRequestedThread, setPreviousRequestedThread] = React.useState(requestedThread);
  if (previousRequestedThread !== requestedThread) {
    setPreviousRequestedThread(requestedThread);
    setActiveId(requestedThread);
  }
  const [backendError, setBackendError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [actionPending, setActionPending] = React.useState(false);
  const [takeoverPending, setTakeoverPending] = React.useState(false);
  const messageSync = React.useRef(createMessageSync());

  const refreshConversations = React.useCallback(async () => {
    const data = await fetchConversations();
    setThreads((prev) =>
      data.map((summary) => {
        const existing = prev.find((thread) => thread.id === summary.id);
        return {
          id: summary.id, driverId: summary.driverId, jobId: summary.jobId, driver: summary.driver, phone: summary.phone, jobNumber: summary.jobNumber, route: "", lastMessage: summary.lastMessage,
          lastActivity: fmtClock(summary.lastActivity), unread: summary.unread, online: false, verified: summary.verified, aiPaused: summary.aiPaused,
          messages: existing?.messages ?? [],
        };
      }),
    );
  }, []);

  const refreshMessages = React.useCallback(async (conversationId: string) => {
    const token = messageSync.current.beginRead(conversationId);
    if (!token) return;
    const data = await fetchConversationMessages(conversationId);
    if (!messageSync.current.canApply(conversationId, token)) return;
    setThreads((prev) =>
      !messageSync.current.canApply(conversationId, token) ? prev : prev.map((thread) =>
        thread.id === conversationId
          ? {
            ...thread,
            messages: reconcileMessages(thread.messages, data.map((message) => ({
              id: message.id, kind: message.kind, type: message.type, text: message.text, time: fmtClock(message.time),
              deliveryStatus: message.deliveryStatus, interpretation: message.interpretation, attachments: message.attachments,
            }))),
          }
          : thread,
      ),
    );
  }, []);

  const tick = React.useCallback(async (signal: AbortSignal) => {
    try {
      await refreshConversations();
      if (activeId) await refreshMessages(activeId);
      if (!signal.aborted) setBackendError(null);
    } catch {
      if (!signal.aborted) setBackendError("Cannot reach the backend - is it running on port 4000?");
    }
  }, [activeId, refreshConversations, refreshMessages]);

  const { refresh } = usePolling(tick, POLL_INTERVAL_MS);

  const active = threads.find((thread) => thread.id === activeId) ?? null;

  const openThread = React.useCallback((id: string) => {
    setActiveId(id);
    setThreads((prev) => prev.map((thread) => (thread.id === id ? { ...thread, unread: 0 } : thread)));
    // The server state catches up on the next refresh; the thread stays usable meanwhile.
    void markConversationRead(id).then(refreshConversations).catch(() => undefined);
    void refresh();
  }, [refreshConversations, refresh]);

  React.useEffect(() => {
    if (requestedThread) void markConversationRead(requestedThread).then(refreshConversations).catch(() => undefined);
  }, [requestedThread, refreshConversations]);

  /** Show the reply at once as "queued", then replace it with what the server stored; a refusal marks it failed. */
  const sendMessage = async (text: string): Promise<void> => {
    if (!text || !activeId || sending) return;
    const conversationId = activeId;
    if (!messageSync.current.beginSend(conversationId)) return;
    const tempId = `local-${crypto.randomUUID()}`;
    const optimistic: ChatMessage = { id: tempId, kind: "MANAGER", text, time: nowTime(), deliveryStatus: "QUEUED" };
    setThreads((prev) => prev.map((thread) => (thread.id === activeId ? { ...thread, messages: [...thread.messages, optimistic], lastMessage: text, lastActivity: optimistic.time } : thread)));
    setSending(true);
    try {
      const saved = await sendManagerMessage(conversationId, text);
      setThreads(prev => prev.map(thread => thread.id === conversationId ? {
        ...thread, messages: acknowledgeMessage(thread.messages, tempId, { ...saved, time: fmtClock(saved.time) }),
      } : thread));
      feedback.success("WhatsApp reply sent.");
    } catch (err) {
      const message = describeError(err, "Failed to send message");
      setBackendError(message); feedback.error(message);
      // A WhatsApp delivery failure can still have a stored row. Keep that id so polling cannot duplicate the bubble.
      const storedId = err instanceof ApiError && typeof err.body.messageId === "string" ? err.body.messageId : null;
      setThreads((prev) => prev.map((thread) => (thread.id === activeId
        ? { ...thread, messages: thread.messages.map((m) => (m.id === tempId ? { ...m, id: storedId ?? tempId, clientId: tempId, deliveryStatus: "FAILED" as const } : m)) }
        : thread)));
    } finally {
      messageSync.current.finishSend(conversationId);
      setSending(false);
      await Promise.all([refreshMessages(conversationId), refreshConversations()]).catch(() => undefined);
    }
  };

  /** Clear the messages or delete the open conversation. Resolves true when done. */
  const confirmAction = async (action: "clear" | "delete"): Promise<boolean> => {
    if (!activeId || actionPending) return false;
    setActionPending(true);
    try {
      if (action === "clear") {
        await clearConversation(activeId);
        messageSync.current.invalidate(activeId);
        setThreads((prev) => prev.map((thread) => (thread.id === activeId ? { ...thread, messages: [], lastMessage: "", lastActivity: "" } : thread)));
      } else {
        await deleteConversation(activeId);
        messageSync.current.invalidate(activeId);
        setThreads((prev) => prev.filter((thread) => thread.id !== activeId));
        setActiveId(null);
      }
      feedback.success(action === "clear" ? "Conversation messages cleared." : "Conversation deleted.");
      await refreshConversations().catch(() => feedback.warning("Action completed, but the conversation list could not be refreshed yet."));
      return true;
    } catch (err) {
      const message = describeError(err, "Action failed");
      setBackendError(message); feedback.error(message);
      return false;
    } finally {
      setActionPending(false);
    }
  };

  const toggleTakeover = async () => {
    if (!active || takeoverPending) return;
    setTakeoverPending(true);
    try {
      const result = await setConversationTakeover(active.id, !active.aiPaused);
      feedback.info(result.aiPaused ? "Manager takeover enabled. AI replies are paused." : "AI dispatcher resumed.");
      setThreads((prev) => prev.map((thread) => (thread.id === active.id ? { ...thread, aiPaused: result.aiPaused } : thread)));
    } catch (err) {
      const message = describeError(err, "Could not update AI takeover");
      setBackendError(message); feedback.error(message);
    } finally {
      setTakeoverPending(false);
    }
  };

  return { threads, active, activeId, backendError, sending, actionPending, takeoverPending, openThread, closeThread: () => setActiveId(null), sendMessage, confirmAction, toggleTakeover };
}
