"use client";

import * as React from "react";
import { describeError } from "@/shared/api/describeError";
import { usePolling } from "@/shared/hooks/usePolling";
import { deleteDriver, fetchDrivers, updateDriverStatus } from "../api";
import type { Driver, DriverStatus } from "../types";
import { feedback } from "@/shared/feedback/store";

const REFRESH_MS = 15_000;

/** The driver list: loaded now, refreshed every 15 seconds while the tab is visible, and edited in place. */
export function useDrivers() {
  const [drivers, setDrivers] = React.useState<Driver[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const load = React.useCallback(async (signal: AbortSignal) => {
    try {
      const data = await fetchDrivers();
      if (signal.aborted) return;
      setDrivers(data);
      setLoadError(null);
    } catch (err) {
      if (signal.aborted) return;
      // Keep what is already on screen when a refresh fails.
      setDrivers((current) => current ?? []);
      setLoadError(describeError(err, "Could not load drivers."));
    }
  }, []);

  const { refresh } = usePolling(load, REFRESH_MS);

  const addDriver = (driver: Driver) => setDrivers((current) => [driver, ...(current ?? [])]);

  const replaceDriver = (driver: Driver) => setDrivers((current) => current?.map((d) => (d.id === driver.id ? driver : d)) ?? current);

  /** Show the new status at once; if the server refuses, say so and reload the truth. */
  const changeStatus = async (id: string, status: DriverStatus) => {
    setDrivers((current) => current?.map((d) => (d.id === id ? { ...d, status } : d)) ?? current);
    try {
      await updateDriverStatus(id, status);
      feedback.success(`Driver status changed to ${status.toLowerCase()}.`);
    } catch (err) {
      const message = describeError(err, "Could not update driver status.");
      setLoadError(message); feedback.error(message);
      void refresh();
    }
  };

  /** Throws when the server refuses, so the dialog can stay open and show why. */
  const removeDriver = async (id: string) => {
    await deleteDriver(id);
    setDrivers((current) => current?.filter((d) => d.id !== id) ?? current);
  };

  return { drivers, loadError, setLoadError, reload: refresh, addDriver, replaceDriver, changeStatus, removeDriver };
}
