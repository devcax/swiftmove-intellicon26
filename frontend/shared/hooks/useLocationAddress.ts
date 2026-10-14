"use client";

import { useEffect, useRef, useState } from 'react';
import { lookupLocationAddress } from '@/shared/api/locationAddress';
import type { GeoPoint } from '@/shared/types/location';

export function useLocationAddress(onChange: (point: GeoPoint, address: string) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const active = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = useRef(onChange);
  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => () => {
    active.current?.abort();
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const select = (point: GeoPoint) => {
    active.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    const controller = new AbortController();
    active.current = controller;
    change.current(point, ''); // An old address must never be saved with a new pin.
    setLoading(true);
    setError(undefined);
    timer.current = setTimeout(async () => {
      try {
        const result = await lookupLocationAddress(point, controller.signal);
        if (!controller.signal.aborted) change.current(point, result.address);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not find the address. Please retry.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
  };
  return { select, loading, error };
}
