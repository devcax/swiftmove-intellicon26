import { request } from "@/shared/api/client";
import { chatCreatedSchema, chatListSchema, chatSchema, confirmResultSchema, turnSchema } from "./schemas";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export async function createChat(): Promise<string> {
  return chatCreatedSchema.parse(await request<unknown>("/api/manager-chat", { method: "POST", ...json({}) })).id;
}

export async function fetchChat(id: string) {
  return chatSchema.parse(await request<unknown>(`/api/manager-chat/${id}`));
}

export async function sendMessage(id: string, text: string) {
  return turnSchema.parse(await request<unknown>(`/api/manager-chat/${id}/messages`, { method: "POST", ...json({ text }) }));
}

export async function answerConfirmation(id: string, token: string, decision: "confirm" | "cancel") {
  return confirmResultSchema.parse(await request<unknown>(`/api/manager-chat/${id}/confirm`, { method: "POST", ...json({ token, decision }) }));
}

export async function fetchChats() {
  return chatListSchema.parse(await request<unknown>("/api/manager-chat"));
}

export async function setContextMessages(id: string, contextMessages: number) {
  await request<unknown>(`/api/manager-chat/${id}`, { method: "PATCH", ...json({ contextMessages }) });
}

export async function renameChat(id: string, title: string) {
  await request<unknown>(`/api/manager-chat/${id}`, { method: "PATCH", ...json({ title }) });
}

export async function clearChat(id: string) {
  await request<unknown>(`/api/manager-chat/${id}/clear`, { method: "POST", ...json({}) });
}

export async function deleteChat(id: string) {
  await request<unknown>(`/api/manager-chat/${id}`, { method: "DELETE" });
}
