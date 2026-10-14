const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const { toActiveJob, toIncidentLine, toAiEvent, toKpis } = require('../present');
const repo = require('../repo');
const { jobBreakdown } = require('../insights');
const { APP_TIMEZONE } = require('../../../platform/time');

module.exports = defineQuery({
  name: 'stats.overview',
  description: 'The operations overview: six key numbers, the jobs on the road, the open incidents and the latest things the AI understood.',
  roles: ['ADMIN', 'MANAGER'],
  input: z.object({}),
  handler: async ({ actor, db }) => {
    const id = actor.organizationId;
    const [jobs, requests, incidents, active, open, feed, drivers, statuses, activity, unread] = await Promise.all([
      repo.countJobs(db, id), repo.countPendingRequests(db, id), repo.countOpenIncidents(db, id), repo.listActiveJobs(db, id),
      repo.listLatestOpenIncidents(db, id), repo.listRecentAiReadings(db, id),
      repo.driverSnapshot(db, id), repo.jobStatusCounts(db, id), repo.dailyJobActivity(db, id), repo.countUnreadDriverMessages(db, id),
    ]);
    return {
      kpis: toKpis({ jobs, requests, incidents }), activeJobs: active.map(toActiveJob),
      openIncidents: open.map(toIncidentLine), recentAiEvents: feed.map(toAiEvent),
      insights: { drivers, jobs: jobBreakdown(statuses), activity, unreadDriverMessages: unread, timezone: APP_TIMEZONE },
    };
  },
});
