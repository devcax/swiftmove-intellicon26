const { LIVE_STATUSES } = require('./statuses');

/** Disjoint groups: every existing job contributes to exactly one slice. */
function jobBreakdown(rows) {
  const groups = { draft: 0, open: 0, live: 0, completed: 0, cancelled: 0, other: 0 };
  for (const { status, count } of rows) {
    const key = status === 'DRAFT' ? 'draft'
      : ['PUBLISHED', 'DRIVER_REQUESTED'].includes(status) ? 'open'
        : status === 'COMPLETED' ? 'completed'
          : status === 'CANCELLED' ? 'cancelled'
            : LIVE_STATUSES.includes(status) ? 'live' : 'other';
    groups[key] += Number(count);
  }
  return groups;
}

module.exports = { jobBreakdown };
