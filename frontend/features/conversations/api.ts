import { request } from "@/shared/api/client";
import type { ApiChatMessage, ApiConversationSummary } from "./types";

export function fetchConversations(): Promise<ApiConversationSummary[]> {
  return request<ApiConversationSummary[]>("/api/conversations");
}

export function fetchConversationMessages(conversationId: string): Promise<ApiChatMessage[]> {
  return request<ApiChatMessage[]>(`/api/conversations/${conversationId}/messages`);
}

export function markConversationRead(conversationId: string): Promise<{ readAt: string }> {
  return request(`/api/conversations/${conversationId}/read`, { method: "POST" });
}

export function sendManagerMessage(conversationId: string, body: string): Promise<ApiChatMessage> {
  return request<ApiChatMessage>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body, source_type: "MANUAL_MANAGER_MESSAGE" }),
  });
}

export function clearConversation(conversationId: string): Promise<{ ok: boolean; deleted: number }> {
  return request(`/api/conversations/${conversationId}/messages`, { method: "DELETE" });
}

export function deleteConversation(conversationId: string): Promise<{ ok: boolean }> {
  return request(`/api/conversations/${conversationId}`, { method: "DELETE" });
}

{/*Drivers*/}

{/*Job request queue (manager approvals)*/}


{/*Dashboard stats (sidebar badges)*/}

export function setConversationTakeover(
  conversationId: string,
  enabled: boolean,
): Promise<{ aiPaused: boolean }> {
  return request(`/api/conversations/${conversationId}/takeover`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}
