const { ID_SHAPE } = require('../summarizeInput');

const EMPTY = () => ({ driver: [], job: [], pending: [] });

/** Which subject ids to look evidence up for: the driver, the job, and a PENDING reference sent with the action. */
function evidenceSubjects(ctx) {
  const pendingRef = typeof ctx.params?.evidenceRef === 'string' && ID_SHAPE.test(ctx.params.evidenceRef) ? ctx.params.evidenceRef : null;
  const driverId = ctx.driver?.id ?? null;
  const jobId = ctx.job?.id ?? null;
  return { driverId, jobId, pendingRef, ids: [driverId, jobId, pendingRef].filter(Boolean) };
}

/** Split rows (newest first, revoked already left out) into what belongs to the driver, the job, and the pending reference. */
function partitionEvidence(rows, { driverId, jobId, pendingRef }) {
  const out = EMPTY();
  for (const row of rows) {
    if (row.subject_type === 'DRIVER' && row.subject_id === driverId) out.driver.push(row);
    else if (row.subject_type === 'JOB' && row.subject_id === jobId) out.job.push(row);
    else if (row.subject_type === 'PENDING' && row.subject_id === pendingRef) out.pending.push(row);
  }
  return out;
}

module.exports = { evidenceSubjects, partitionEvidence, EMPTY };
