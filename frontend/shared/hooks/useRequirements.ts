"use client";

import * as React from "react";
import { fetchRequirements, type Requirements } from "../api/requirements";

const NONE: Requirements = { fields: [], notices: [] };

/**
 * The fields and notices an action needs, fetched when `enabled` becomes true (for example when a dialog opens), so a
 * policy added or removed shows up the next time the form is opened. A failure leaves the form without extras: the server
 * check still guards the action.
 */
export function useRequirements(actionName: string, enabled: boolean, match?: Record<string, string>) {
  const [requirements, setRequirements] = React.useState<Requirements>(NONE);
  const [loading, setLoading] = React.useState(false);
  const matchKey = JSON.stringify(match ?? {});

  React.useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const loaded = await fetchRequirements(actionName, JSON.parse(matchKey) as Record<string, string>);
        if (!cancelled) setRequirements(loaded);
      } catch {
        if (!cancelled) setRequirements(NONE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actionName, enabled, matchKey]);

  return { ...requirements, loading };
}
