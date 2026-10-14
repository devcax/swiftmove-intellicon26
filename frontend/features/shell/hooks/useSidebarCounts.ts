"use client";

import * as React from "react";
import { fetchSidebarCounts, fetchSidebarNotifications } from "@/features/shell/api";
import { notificationCount } from "@/features/shell/nav";
import type { SidebarBadgeCounts } from "@/features/shell/nav";
import type { ApiSidebarNotifications } from "@/features/shell/types";

const REFRESH_MS = 10_000;
const NO_COUNTS: SidebarBadgeCounts = { jobs: 0, conversations: 0, incidents: 0, requests: 0 };

/** The numbers on the sidebar badges: what is new since the last check, cleared when the manager opens that page. */
export function useSidebarCounts(pathname: string) {
  const [counts, setCounts] = React.useState<SidebarBadgeCounts>(NO_COUNTS);
  const snapshot = React.useRef<ApiSidebarNotifications | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [sidebarCounts, notifications] = await Promise.all([fetchSidebarCounts(), fetchSidebarNotifications()]);
        if (cancelled) return;

        const previous = snapshot.current;
        snapshot.current = notifications;

        const path = window.location.pathname;
        const onJobs = path.startsWith("/jobs");
        const onRequests = path.startsWith("/requests");

        if (previous === null) {
          setCounts({
            jobs: 0,
            conversations: sidebarCounts.conversations,
            incidents: notifications.incidentIds.length,
            requests: onRequests ? 0 : notifications.jobRequestIds.length,
          });
          return;
        }

        const newLiveJobs = notificationCount(notifications.liveJobStamps, previous.liveJobStamps);
        const newIncidents = notificationCount(notifications.incidentIds, previous.incidentIds);
        const newRequests = notificationCount(notifications.jobRequestIds, previous.jobRequestIds);

        setCounts((current) => ({
          jobs: onJobs ? 0 : current.jobs + newLiveJobs,
          conversations: sidebarCounts.conversations,
          incidents: current.incidents + newIncidents,
          requests: onRequests ? 0 : current.requests + newRequests,
        }));
      } catch {
        // The badges stay as they are until the next check.
      }
    };
    void load();
    const interval = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Opening Jobs or Requests clears its badge (adjusted while rendering, not in an effect).
  const [seenPath, setSeenPath] = React.useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    if (pathname.startsWith("/jobs") || pathname.startsWith("/requests")) {
      setCounts((current) => ({
        ...current,
        jobs: pathname.startsWith("/jobs") ? 0 : current.jobs,
        requests: pathname.startsWith("/requests") ? 0 : current.requests,
      }));
    }
  }

  return counts;
}
