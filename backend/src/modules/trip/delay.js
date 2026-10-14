/** Is a stage late, and has the driver said why. Works on a Prisma job row (camelCase) or an old database row (snake_case). */
const pick = (job, camel, snake) => job[camel] ?? job[snake] ?? null;

function stageDelay(job, stage) {
  const pickup = stage === 'PICKUP';
  const scheduledAt = pickup ? pick(job, 'pickupAt', 'pickup_at') : pick(job, 'deliveryAt', 'delivery_at');
  const actualAt = pickup ? pick(job, 'pickupActualAt', 'pickup_actual_at') : pick(job, 'deliveryActualAt', 'delivery_actual_at');
  const reason = pickup ? pick(job, 'pickupDelayReason', 'pickup_delay_reason') : pick(job, 'deliveryDelayReason', 'delivery_delay_reason');
  const late = Boolean(scheduledAt && actualAt && new Date(actualAt).getTime() > new Date(scheduledAt).getTime());
  const minutesLate = late ? Math.round((new Date(actualAt) - new Date(scheduledAt)) / 60000) : 0;
  return { late, scheduledAt, actualAt, minutesLate, reasonRecorded: Boolean(reason), reason: reason ?? null };
}

module.exports = { stageDelay };
