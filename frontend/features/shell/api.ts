import { request } from "@/shared/api/client";
import type { ApiSidebarCounts, ApiSidebarNotifications } from "./types";

export function fetchSidebarCounts(): Promise<ApiSidebarCounts> {
  return request<ApiSidebarCounts>("/api/stats/sidebar-counts");
}

export function fetchSidebarNotifications(): Promise<ApiSidebarNotifications> {
  return request<ApiSidebarNotifications>("/api/stats/sidebar-notifications");
}
