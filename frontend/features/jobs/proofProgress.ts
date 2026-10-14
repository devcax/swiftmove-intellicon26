import type { ApiJobDetail, ApiTimelineEvent } from './types';
import { LADDER_RANK } from './workflow';

export interface PendingProofProgress { milestone: 'LOADED' | 'DELIVERED'; stage: 'PICKUP' | 'DELIVERY'; index: number; reportedAt: string }

/** A reported milestone is visible, but never counts as confirmed progress. */
export function pendingProofProgress(job: ApiJobDetail, timeline: ApiTimelineEvent[], confirmedIndex: number): PendingProofProgress | null {
  if (!job.assignment || ['CANCELLED', 'COMPLETED', 'PUBLISHED', 'DRAFT'].includes(job.status)) return null;
  const candidates = timeline.flatMap(event => {
    if (event.type !== 'MILESTONE_REPORTED' || event.status !== 'REVIEW_REQUIRED' || event.data.assignmentId !== job.assignment!.id) return [];
    const milestone = event.data.milestone;
    if (milestone !== 'LOADED' && milestone !== 'DELIVERED') return [];
    const index = LADDER_RANK[milestone];
    const stage = milestone === 'LOADED' ? 'PICKUP' : 'DELIVERY';
    if (confirmedIndex >= index || (stage === 'PICKUP' ? job.pickupVerifiedAt : job.deliveryVerifiedAt)) return [];
    return [{ milestone, stage, index, reportedAt: event.time } as PendingProofProgress];
  });
  return candidates.sort((a, b) => b.index - a.index || new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())[0] ?? null;
}
