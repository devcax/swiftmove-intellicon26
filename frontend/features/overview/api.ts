import { request } from "@/shared/api/client";
import type { ApiOperationsOverview } from "./types";

export function fetchOperationsOverview(signal?: AbortSignal): Promise<ApiOperationsOverview> {
  return request<ApiOperationsOverview>("/api/stats/overview", { signal });
}
