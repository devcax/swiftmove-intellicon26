"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { describeError } from "@/shared/api/describeError";
import { usePolling } from "@/shared/hooks/usePolling";
import { fetchIncident, fetchIncidents } from "../api";
import type { ApiIncidentDetail, ApiIncidentSummary } from "../types";
import { feedback } from "@/shared/feedback/store";

const REFRESH_MS = 5_000;

/** The incident list for a status filter (refreshed every 5 seconds) and the one open in the drawer, with `run` for a manager action. */
export function useIncidents() {
  const searchParams = useSearchParams();
  const requestedIncident = searchParams.get("incident");
  const [filter, setFilter] = React.useState("");
  const [allIncidents, setAllIncidents] = React.useState<ApiIncidentSummary[] | null>(null);
  const [incidents, setIncidents] = React.useState<ApiIncidentSummary[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(requestedIncident);
  const [detail, setDetail] = React.useState<ApiIncidentDetail | null>(null);
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [previousRequestedIncident, setPreviousRequestedIncident] = React.useState(requestedIncident);
  if (previousRequestedIncident !== requestedIncident) {
    setPreviousRequestedIncident(requestedIncident);
    setSelectedId(requestedIncident);
    setDetail(null);
    setNotes("");
  }

  const load = React.useCallback(async (signal: AbortSignal) => {
    try {
      const [all, filtered] = await Promise.all([
        fetchIncidents(),
        filter ? fetchIncidents({ status: filter }) : Promise.resolve(null),
      ]);
      if (signal.aborted) return;
      setAllIncidents(all);
      setIncidents(filtered ?? all);
      setError(null);
    } catch (err) {
      if (!signal.aborted) setError(describeError(err, "Failed to load incidents"));
    }
  }, [filter]);

  const { refresh } = usePolling(load, REFRESH_MS);

  const changeFilter = (next: string) => {
    setFilter(next);
    setIncidents(null);
  };

  const openDetail = React.useCallback(async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    try {
      const data = await fetchIncident(id);
      setDetail(data);
      setNotes(data.managerNotes ?? "");
    } catch (err) {
      setActionError(describeError(err, "Failed to load incident"));
      feedback.error(describeError(err, "Failed to load incident"));
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    if (requestedIncident) void fetchIncident(requestedIncident).then(data => {
      if (cancelled) return;
      setDetail(data);
      setNotes(data.managerNotes ?? "");
    }).catch(err => {
      if (!cancelled) feedback.error(describeError(err, "Failed to load incident"));
    });
    return () => { cancelled = true; };
  }, [requestedIncident]);

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  /** Do a manager action, then show the list and the open incident as they are now. */
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await work();
      feedback.success("Incident updated successfully.");
      await refresh();
      if (selectedId) await openDetail(selectedId);
    } catch (err) {
      const message = describeError(err, "Action failed");
      setActionError(message); feedback.error(message);
    } finally {
      setBusy(false);
    }
  };

  return { filter, changeFilter, incidents, allIncidents, error, actionError, selectedId, detail, notes, setNotes, busy, openDetail, closeDetail, run };
}
