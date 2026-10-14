"use client";

import * as React from "react";
import { describeError } from "@/shared/api/describeError";
import { notifyDataChanged } from "@/shared/hooks/dataChanged";
import { answerConfirmation, clearChat, createChat, deleteChat, fetchChat, fetchChats, renameChat, sendMessage, setContextMessages } from "../api";
import { describeActivity } from "../activity";
import { DEFAULT_CONTEXT } from "../schemas";
import { feedback } from "@/shared/feedback/store";
import type { Blocked, ChatSummary, Confirmation } from "../schemas";

export type ConfirmationStatus = "pending" | "working" | "confirmed" | "cancelled" | "failed";

export type ChatEntry =
  | { kind: "user" | "assistant"; id: string; text: string }
  | { kind: "activity"; id: string; text: string; outcome: string }
  | { kind: "blocked"; id: string; blocked: Blocked; resolved: boolean }
  | { kind: "confirm"; id: string; confirmation: Confirmation; status: ConfirmationStatus; note?: string }
  | { kind: "error"; id: string; text: string };

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${(counter += 1)}`;
/** Where the messages of a chat that has not been saved yet are kept. */
const DRAFT = "draft";

/**
 * The assistant's chats. Every chat keeps its own messages and its own context size (how many of its latest messages the assistant reads);
 * nothing is shared between them. A new chat is saved on the server with its first message.
 */
export function useManagerChat(open: boolean) {
  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [limits, setLimits] = React.useState(DEFAULT_CONTEXT);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [byChat, setByChat] = React.useState<Record<string, ChatEntry[]>>({});
  const [sending, setSending] = React.useState(false);
  const [managing, setManaging] = React.useState(false);
  const [loadingChats, setLoadingChats] = React.useState(false);
  const [loadingChat, setLoadingChat] = React.useState<string | null>(null);
  const [managementError, setManagementError] = React.useState<string | null>(null);
  const [draftContext, setDraftContext] = React.useState<number | null>(null);
  const busy = React.useRef(false);
  const key = activeId ?? DRAFT;
  const entries = React.useMemo(() => byChat[key] ?? [], [byChat, key]);
  const active = chats.find((c) => c.id === activeId) ?? null;
  const contextMessages = active?.contextMessages ?? draftContext ?? limits.default;

  const addTo = React.useCallback((chat: string, ...more: ChatEntry[]) => setByChat((all) => ({ ...all, [chat]: [...(all[chat] ?? []), ...more] })), []);
  const refresh = React.useCallback(async () => {
    setLoadingChats(true);
    try {
      const list = await fetchChats();
      setChats(list.chats);
      setLimits(list.context);
    } catch (err) {
      setManagementError(describeError(err, "Could not load your chats."));
    } finally { setLoadingChats(false); }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void (async () => {
      await refresh();
    })();
  }, [open, refresh]);

  const select = React.useCallback(async (id: string | null) => {
    if (busy.current) return;
    setActiveId(id);
    if (id === null || byChat[id]) return;
    setLoadingChat(id);
    try {
      const chat = await fetchChat(id);
      const loaded: ChatEntry[] = chat.messages.map((m): ChatEntry => (m.role === "tool"
        ? { kind: "activity", id: nextId("a"), text: describeActivity(m.toolName ?? undefined, m.toolOutcome ?? "ok"), outcome: m.toolOutcome ?? "ok" }
        : { kind: m.role, id: m.id, text: m.content }));
      setByChat((all) => ({ ...all, [id]: loaded }));
    } catch (err) {
      addTo(id, { kind: "error", id: nextId("e"), text: describeError(err, "Could not open that chat.") });
    } finally { setLoadingChat(current => current === id ? null : current); }
  }, [byChat, addTo]);

  const send = React.useCallback(async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed || busy.current || loadingChat !== null) return false;
    busy.current = true;
    setSending(true);
    let chat = activeId ?? DRAFT;
    // A card for an earlier rule that was answered by this message no longer needs the manager.
    setByChat((all) => ({ ...all, [chat]: [...(all[chat] ?? []).map((e) => (e.kind === "blocked" ? { ...e, resolved: true } : e)), { kind: "user", id: nextId("u"), text: trimmed }] }));
    try {
      if (activeId === null) {
        const created = await createChat();
        setByChat((all) => ({ ...all, [created]: all[DRAFT] ?? [], [DRAFT]: [] }));
        setActiveId(created);
        chat = created;
        setChats(list => [{ id: created, title: trimmed.slice(0, 60), contextMessages, updatedAt: new Date().toISOString() }, ...list]);
        if (contextMessages !== limits.default) await setContextMessages(created, contextMessages);
      }
      const turn = await sendMessage(chat, trimmed);
      const added: ChatEntry[] = turn.activity.map((a) => ({ kind: "activity", id: nextId("a"), text: describeActivity(a.tool, a.outcome), outcome: a.outcome }));
      for (const blocked of turn.blocked) added.push({ kind: "blocked", id: nextId("b"), blocked, resolved: false });
      for (const confirmation of turn.confirmations) added.push({ kind: "confirm", id: nextId("c"), confirmation, status: "pending" });
      added.push({ kind: "assistant", id: turn.reply.id, text: turn.reply.content });
      addTo(chat, ...added);
      if (turn.changed.length > 0) { notifyDataChanged(); feedback.success("The assistant completed the requested changes."); }
      if (turn.confirmations.length > 0) feedback.info("An assistant action is waiting for your confirmation.");
      if (turn.blocked.length > 0) feedback.warning("The assistant needs more information to continue.");
      return true;
    } catch (err) {
      const message = describeError(err, "Could not reach the assistant. Please try again.");
      addTo(chat, { kind: "error", id: nextId("e"), text: message }); feedback.error(message);
      return false;
    } finally {
      busy.current = false;
      setSending(false);
      void refresh();
    }
  }, [activeId, addTo, refresh, loadingChat, contextMessages, limits.default]);

  const answer = React.useCallback(async (entryId: string, decision: "confirm" | "cancel") => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry || entry.kind !== "confirm" || activeId === null) return;
    const update = (status: ConfirmationStatus, note?: string) =>
      setByChat((all) => ({ ...all, [activeId]: (all[activeId] ?? []).map((e) => (e.id === entryId && e.kind === "confirm" ? { ...e, status, note } : e)) }));
    update("working");
    try {
      const result = await answerConfirmation(activeId, entry.confirmation.token, decision);
      if (result.cancelled) { feedback.info("Assistant action cancelled."); return update("cancelled"); }
      if (!result.ok) { const message = result.message ?? result.error ?? "That could not be done."; feedback.error(message); return update("failed", message); }
      update("confirmed");
      feedback.success("Assistant action completed.");
      notifyDataChanged();
    } catch (err) {
      const message = describeError(err, "That could not be done.");
      update("failed", message); feedback.error(message);
    }
  }, [entries, activeId]);

  /** Change how many of this chat's latest messages the assistant reads. */
  const changeContext = React.useCallback(async (value: number) => {
    if (busy.current || !Number.isFinite(value)) return;
    const next = Math.min(limits.max, Math.max(limits.min, Math.round(value)));
    if (activeId === null) { setDraftContext(next); feedback.success("Context limit saved for your next chat."); return; }
    setChats((list) => list.map((c) => (c.id === activeId ? { ...c, contextMessages: next } : c)));
    try {
      await setContextMessages(activeId, next);
      feedback.success("Chat context limit saved.");
    } catch (err) {
      const message = describeError(err, "Could not change the context size.");
      setManagementError(message); feedback.error(message);
      void refresh();
    }
  }, [activeId, limits, refresh]);

  /** Forget everything said in this chat. */
  const clear = React.useCallback(async () => {
    if (activeId === null) return setByChat((all) => ({ ...all, [DRAFT]: [] }));
    try {
      await clearChat(activeId);
      feedback.success("Chat messages cleared.");
      setByChat((all) => ({ ...all, [activeId]: [] }));
      void refresh();
    } catch (err) {
      const message = describeError(err, "Could not clear the chat.");
      addTo(activeId, { kind: "error", id: nextId("e"), text: message }); feedback.error(message);
    }
  }, [activeId, addTo, refresh]);

  /** Delete this chat and everything in it. */
  const remove = React.useCallback(async (id: string | null = activeId) => {
    if (id === null || busy.current) return;
    setManaging(true);
    setManagementError(null);
    try {
      await deleteChat(id);
      feedback.success("Chat deleted.");
      setByChat((all) => Object.fromEntries(Object.entries(all).filter(([key]) => key !== id)));
      setChats(list => list.filter(item => item.id !== id));
      if (id === activeId) setActiveId(null);
    } catch (err) {
      const message = describeError(err, "Could not delete the chat.");
      setManagementError(message); feedback.error(message);
    } finally { setManaging(false); }
  }, [activeId]);

  const rename = React.useCallback(async (id: string, title: string) => {
    if (busy.current || !title.trim()) return false;
    setManaging(true);
    setManagementError(null);
    try {
      await renameChat(id, title.trim());
      feedback.success("Chat renamed.");
      setChats(list => list.map(item => item.id === id ? { ...item, title: title.trim() } : item));
      return true;
    } catch (err) { const message = describeError(err, "Could not rename the chat."); setManagementError(message); feedback.error(message); return false; }
    finally { setManaging(false); }
  }, []);

  const newChat = () => {
    if (busy.current) return;
    setActiveId(null);
    setByChat(all => ({ ...all, [DRAFT]: [] }));
  };

  return { chats, limits, activeId, active, entries, sending, managing, loadingChats, loadingChat, managementError, dismissError: () => setManagementError(null), refresh, rename, contextMessages, select, newChat, send, answer, changeContext, clear, remove };
}

export type ManagerChat = ReturnType<typeof useManagerChat>;
