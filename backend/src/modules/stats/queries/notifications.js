const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'stats.notifications',
  description: 'What the sidebar watches to know when something new arrived: recent driver message ids, a stamp per live job, open incident ids and pending request ids.',
  roles: ['ADMIN', 'MANAGER'],
  input: z.object({}),
  handler: async ({ actor, db }) => {
    const id = actor.organizationId;
    const [messages, jobs, incidents, requests] = await Promise.all([
      repo.listRecentDriverMessageIds(db, id), repo.listLiveJobStamps(db, id), repo.listOpenIncidentIds(db, id), repo.listPendingRequestIds(db, id),
    ]);
    return {
      driverMessageIds: messages.map((row) => row.id),
      liveJobStamps: jobs.map((row) => `${row.id}:${new Date(row.updated_at).getTime()}`),
      incidentIds: incidents.map((row) => row.id),
      jobRequestIds: requests.map((row) => row.id),
    };
  },
});
