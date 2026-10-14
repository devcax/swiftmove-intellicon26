import { request } from './client';
import type { GeoPoint } from '@/shared/types/location';

export function lookupLocationAddress(point: GeoPoint, signal: AbortSignal) {
  const query = new URLSearchParams({ latitude: String(point.latitude), longitude: String(point.longitude) });
  return request<{ address: string }>(`/api/jobs/location-address?${query}`, { signal });
}
