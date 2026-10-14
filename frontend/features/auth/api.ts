import { request } from "@/shared/api/client";
import { currentUserSchema, type CurrentUser, type LoginInput } from "./schemas";

export async function login(input: LoginInput): Promise<CurrentUser> {
  const body = await request<unknown>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
    redirectOn401: false,
  });
  return currentUserSchema.parse(body);
}

export async function logout(): Promise<void> {
  await request<unknown>("/api/auth/logout", { method: "POST", redirectOn401: false });
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return currentUserSchema.parse(await request<unknown>("/api/auth/me"));
}
