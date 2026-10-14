/** Counts and lists for the dashboard. Raw SQL: aggregates and joins across several tables. Every read filters by organization. */
const { Prisma } = require('@prisma/client');
const { LIVE_STATUSES, AWAITING_COMPLETION, ON_THE_ROAD } = require('./statuses');
const { APP_TIMEZONE } = require('../../platform/time');

const org = (organizationId) => Prisma.sql`${organizationId}::uuid`;

/** Driver messages managers have not read yet, over the open conversations. */
async function countUnreadDriverMessages(db, organizationId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::int AS count
      FROM messages m JOIN conversations c ON c.id = m.conversation_id
     WHERE c.organization_id = ${org(organizationId)} AND c.status = 'OPEN' AND m.sender_type = 'DRIVER'
       AND m.created_at > COALESCE(c.manager_last_read_at, c.created_at)`);
  return rows[0].count;
}

const listRecentDriverMessageIds = (db, organizationId) => db.$queryRaw(Prisma.sql`
  SELECT m.id FROM messages m JOIN conversations c ON c.id = m.conversation_id
   WHERE c.organization_id = ${org(organizationId)} AND m.sender_type = 'DRIVER' ORDER BY m.created_at DESC LIMIT 200`);

const listLiveJobStamps = (db, organizationId) => db.$queryRaw(Prisma.sql`
  SELECT id, updated_at FROM jobs WHERE organization_id = ${org(organizationId)} AND current_status = ANY(${LIVE_STATUSES}::text[])`);

const listOpenIncidentIds = (db, organizationId) => db.$queryRaw(Prisma.sql`
  SELECT i.id FROM incidents i JOIN jobs j ON j.id = i.job_id WHERE j.organization_id = ${org(organizationId)} AND i.status IN ('OPEN', 'UNDER_REVIEW')`);

const listPendingRequestIds = (db, organizationId) => db.$queryRaw(Prisma.sql`
  SELECT r.id FROM job_requests r JOIN jobs j ON j.id = r.job_id WHERE j.organization_id = ${org(organizationId)} AND r.status = 'REQUESTED'`);

async function countJobs(db, organizationId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT COUNT(*) FILTER (WHERE current_status = 'PUBLISHED')::int AS published,
           COUNT(*) FILTER (WHERE current_status = 'DELAYED')::int AS delayed,
           COUNT(*) FILTER (WHERE current_status = ANY(${ON_THE_ROAD}::text[]))::int AS active,
           COUNT(*) FILTER (WHERE current_status = ANY(${AWAITING_COMPLETION}::text[]))::int AS awaiting
      FROM jobs WHERE organization_id = ${org(organizationId)}`);
  return rows[0];
}

async function countPendingRequests(db, organizationId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::int AS count FROM job_requests r JOIN jobs j ON j.id = r.job_id WHERE j.organization_id = ${org(organizationId)} AND r.status = 'REQUESTED'`);
  return rows[0].count;
}

async function countOpenIncidents(db, organizationId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::int AS count FROM incidents i JOIN jobs j ON j.id = i.job_id WHERE j.organization_id = ${org(organizationId)} AND i.status IN ('OPEN', 'UNDER_REVIEW')`);
  return rows[0].count;
}

/** The jobs on the road, most recently changed first (12), with route, driver, last event and any open incident. */
const listActiveJobs = (db, organizationId) => db.$queryRaw(Prisma.sql`
  SELECT j.id, j.job_number, j.current_status, j.updated_at,
         pl.name AS origin, dl.name AS destination, d.name AS driver,
         (SELECT we.event_type FROM workflow_events we WHERE we.job_id = j.id ORDER BY we.created_at DESC LIMIT 1) AS last_event,
         (SELECT we.created_at FROM workflow_events we WHERE we.job_id = j.id ORDER BY we.created_at DESC LIMIT 1) AS last_event_at,
         (SELECT i.description FROM incidents i WHERE i.job_id = j.id AND i.status IN ('OPEN', 'UNDER_REVIEW') ORDER BY i.created_at DESC LIMIT 1) AS exception
    FROM jobs j
    LEFT JOIN job_stops ps ON ps.job_id = j.id AND ps.stop_type = 'PICKUP'
    LEFT JOIN locations pl ON pl.id = ps.location_id
    LEFT JOIN job_stops ds ON ds.job_id = j.id AND ds.stop_type = 'DELIVERY'
    LEFT JOIN locations dl ON dl.id = ds.location_id
    LEFT JOIN job_assignments ja ON ja.job_id = j.id AND ja.status IN ('ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW')
    LEFT JOIN drivers d ON d.id = ja.driver_id
   WHERE j.organization_id = ${org(organizationId)} AND j.current_status = ANY(${ON_THE_ROAD}::text[])
   ORDER BY j.updated_at DESC
   LIMIT 12`);

const listLatestOpenIncidents = (db, organizationId) => db.$queryRaw(Prisma.sql`
  SELECT i.id, i.description, i.created_at, j.job_number
    FROM incidents i JOIN jobs j ON j.id = i.job_id
   WHERE j.organization_id = ${org(organizationId)} AND i.status IN ('OPEN', 'UNDER_REVIEW')
   ORDER BY i.created_at DESC LIMIT 8`);

/** The latest completed AI readings of driver messages on a job (6). */
const listRecentAiReadings = (db, organizationId) => db.$queryRaw(Prisma.sql`
  SELECT ai.id, j.id AS job_id, ai.primary_intent, ai.confidence_score::float8 AS confidence_score, ai.structured_output, ai.created_at, j.job_number
    FROM ai_interpretations ai
    JOIN messages m ON m.id = ai.message_id
    JOIN conversations c ON c.id = m.conversation_id
    JOIN jobs j ON j.id = c.job_id
   WHERE c.organization_id = ${org(organizationId)} AND j.organization_id = ${org(organizationId)} AND ai.processing_status = 'COMPLETED' AND m.sender_type = 'DRIVER'
   ORDER BY ai.created_at DESC LIMIT 6`);

async function driverSnapshot(db, organizationId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'ACTIVE' AND active_job_id IS NULL)::int AS unassigned,
           COUNT(*) FILTER (WHERE status = 'ACTIVE' AND active_job_id IS NOT NULL)::int AS assigned,
           COUNT(*) FILTER (WHERE status <> 'ACTIVE')::int AS inactive
      FROM drivers WHERE organization_id = ${org(organizationId)}`);
  return rows[0];
}

const jobStatusCounts = (db, organizationId) => db.$queryRaw(Prisma.sql`
  SELECT current_status AS status, COUNT(*)::int AS count
    FROM jobs WHERE organization_id = ${org(organizationId)} GROUP BY current_status`);

/** Calendar days in the configured business timezone, including zero-activity days. */
const dailyJobActivity = (db, organizationId) => db.$queryRaw(Prisma.sql`
  WITH bounds AS (
    SELECT (now() AT TIME ZONE ${APP_TIMEZONE})::date AS today
  ), days AS (
    SELECT (today - n)::date AS day FROM bounds CROSS JOIN generate_series(0, 29) AS n
  ), activity AS (
    SELECT (created_at AT TIME ZONE ${APP_TIMEZONE})::date AS day, 'created' AS kind
      FROM jobs, bounds WHERE organization_id = ${org(organizationId)}
        AND created_at >= ((today - 29)::timestamp AT TIME ZONE ${APP_TIMEZONE})
        AND created_at <= now()
    UNION ALL
    SELECT (completed_at AT TIME ZONE ${APP_TIMEZONE})::date AS day, 'completed' AS kind
      FROM jobs, bounds WHERE organization_id = ${org(organizationId)}
        AND completed_at >= ((today - 29)::timestamp AT TIME ZONE ${APP_TIMEZONE})
        AND completed_at <= now()
  )
  SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
         COUNT(*) FILTER (WHERE a.kind = 'created')::int AS created,
         COUNT(*) FILTER (WHERE a.kind = 'completed')::int AS completed
    FROM days d LEFT JOIN activity a ON a.day = d.day GROUP BY d.day ORDER BY d.day`);

module.exports = {
  driverSnapshot, jobStatusCounts, dailyJobActivity,
  countUnreadDriverMessages, listRecentDriverMessageIds, listLiveJobStamps, listOpenIncidentIds, listPendingRequestIds, countJobs,
  countPendingRequests, countOpenIncidents, listActiveJobs, listLatestOpenIncidents, listRecentAiReadings,
};
