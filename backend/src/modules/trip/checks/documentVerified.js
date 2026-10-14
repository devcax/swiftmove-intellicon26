const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');
const { verifiedFor } = require('../documentStage');

module.exports = defineCheck({
  name: 'document_verified',
  label: 'Stage document is verified',
  description: 'The pickup or delivery document for this job has been verified (code match or manager override).',
  actions: ['trip.verifyDocument', 'trip.verifyByManager'],
  params: z.object({ stage: z.enum(['PICKUP', 'DELIVERY']) }),
  paramSpec: [{ name: 'stage', label: 'stage', kind: 'enum', values: ['PICKUP', 'DELIVERY'], required: true }],
  dataDependencies: ['jobs.pickup_verified_at', 'jobs.delivery_verified_at'],
  evidence: { kind: 'DOCUMENT' },
  evaluate: async (ctx, params) => {
    if (verifiedFor(ctx.job, params.stage)) return { pass: true };
    const stage = params.stage;
    return {
      pass: false,
      code: stage === 'PICKUP' ? 'PICKUP_REQUIRED_FIRST' : 'DOCUMENT_NOT_VERIFIED',
      message:
        stage === 'PICKUP'
          ? 'The pickup document must be verified before the delivery document.'
          : 'The delivery document must be verified first.',
      reason: `the ${stage.toLowerCase()} document is not verified yet`,
      evidence: { kind: 'DOCUMENT', stage },
    };
  },
});
