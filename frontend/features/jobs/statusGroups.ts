import { LIVE_JOB_STATUSES } from './workflow';
import type { JobStatus } from './types';

/** ACTIVE is a list category; API jobs carry their actual lifecycle milestone. */
export function matchesJobStatus(status: string, category: 'ALL' | JobStatus) {
  if (category === 'ALL') return true;
  if (category === 'ACTIVE') return status === 'ACTIVE' || LIVE_JOB_STATUSES.has(status);
  return status === category;
}
