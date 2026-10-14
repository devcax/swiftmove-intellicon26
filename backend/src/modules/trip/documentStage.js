const { getPolicySetting } = require('../../platform/policy/store');

const STAGES = ['PICKUP', 'DELIVERY'];

/** For each stage: the job columns, the milestone a verified document reaches, and the stages that need a reason when late. */
const stageColumns = (stage) => (stage === 'PICKUP'
  ? { verified: 'pickupVerifiedAt', actual: 'pickupActualAt', proof: 'pickupProofAttachmentId', code: 'pickupCode', target: 'LOADED' }
  : { verified: 'deliveryVerifiedAt', actual: 'deliveryActualAt', proof: 'deliveryProofAttachmentId', code: 'deliveryCode', target: 'DELIVERED' });

/** The stages where a late arrival needs the driver's reason first (a manager setting; both by default). */
async function delayReasonStages(organizationId) {
  const setting = await getPolicySetting(organizationId, 'milestone.delay-reason', { stages: STAGES });
  return Array.isArray(setting?.stages) ? setting.stages : STAGES;
}

/** Has the stage's document been verified on this job? Works on an old database row (snake_case), which is what the policy context holds. */
const verifiedFor = (job, stage) => (stage === 'PICKUP' ? Boolean(job?.pickup_verified_at) : Boolean(job?.delivery_verified_at));

module.exports = { STAGES, stageColumns, delayReasonStages, verifiedFor };
