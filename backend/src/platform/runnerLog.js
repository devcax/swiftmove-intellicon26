const { prisma } = require('./db');
const { logger } = require('./logger');

const { summarizeInput } = require('./summarizeInput');

const actorIdOf = (actor) => actor.userId ?? actor.driverId ?? null;

/**
 * Write one action_log row. `client` is the transaction on success, or the global client for a
 * blocked, denied or failed action (those roll back, so they log afterwards). A logging failure
 * is reported but never hides the real outcome.
 */
async function writeActionLog(client, entry) {
  const { actor, action, outcome, requestId, subject, policyKey, errorCode, durationMs, input } = entry;
  const data = {
    organizationId: actor.organizationId, action, actorType: actor.type, actorId: actorIdOf(actor),
    source: actor.source ?? 'UNKNOWN', requestId: requestId ?? null, subjectType: subject?.type ?? null,
    subjectId: subject?.id ?? null, outcome, policyKey: policyKey ?? null, errorCode: errorCode ?? null,
    durationMs: durationMs ?? null, inputSummary: summarizeInput(input),
  };
  if (client !== prisma) return client.actionLog.create({ data, select: { id: true } });
  try {
    return await client.actionLog.create({ data, select: { id: true } });
  } catch (err) {
    logger.error({ err, action, outcome }, 'could not write the action log');
    return null;
  }
}

module.exports = { writeActionLog, summarizeInput };
