import { request } from "@/shared/api/client";
import type { ApiInstruction } from "./types";

export function fetchInstructions(): Promise<{ instructions: ApiInstruction[] }> {
  return request<{ instructions: ApiInstruction[] }>("/api/ai-instructions");
}

export function updateInstruction(key: string, content: string): Promise<ApiInstruction> {
  return request<ApiInstruction>(`/api/ai-instructions/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export function resetInstruction(key: string): Promise<ApiInstruction> {
  return request<ApiInstruction>(`/api/ai-instructions/${encodeURIComponent(key)}/reset`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
