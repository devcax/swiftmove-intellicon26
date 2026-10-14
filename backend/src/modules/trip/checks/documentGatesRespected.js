const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');
const sm = require('../../../platform/jobStateMachine');
const { verifiedFor } = require('../documentStage');

module.exports = defineCheck({
  name: 'document_gates_respected',
  label: 'Gated milestones need a verified document',
  description:
    'The listed milestones are only confirmed after the matching stage document has been verified. ' +
    'A progress claim that would jump over an unverified gate is refused.',
  actions: ['trip.milestone'],
  params: z.object({ gates: z.record(z.string(), z.enum(['PICKUP', 'DELIVERY'])), phase: z.enum(['direct', 'skipped', 'both']).optional() }),
  paramSpec: [
    { name: 'gates', label: 'milestone → stage', kind: 'gateMap', required: true },
    {
      name: 'phase',
      label: 'when it applies',
      kind: 'enum',
      values: ['direct', 'skipped', 'both'],
      required: false,
      description:
        'direct = the driver claims the gated milestone itself; skipped = a claim would jump over an unverified gate; both = either.',
    },
  ],
  dataDependencies: ['jobs.pickup_verified_at', 'jobs.delivery_verified_at'],
  evidence: { kind: 'DOCUMENT' },
  evaluate: async (ctx, params) => {
    const gates = params.gates && typeof params.gates === 'object' ? params.gates : {};
    const phase = params.phase ?? 'both';
    const source = ctx.params.source ?? 'CHAT';
    const target = ctx.params.milestone;
    const targetRank = sm.MILESTONE_RANK[target];
    if (targetRank == null || !ctx.job) return { pass: true };
    const currentRank = ctx.currentRank ?? 0;

    const messageA = (stage) =>
      stage === 'PICKUP'
        ? 'Loaded is confirmed by the pickup document code, so the pickup document has to be uploaded first.'
        : 'Delivered is confirmed by the delivery document code, so the delivery document has to be uploaded first.';
    const messageB = (stage) =>
      stage === 'PICKUP'
        ? 'The pickup still has to be confirmed by the pickup document code before the job can move this far. Send a photo of the pickup document.'
        : 'The delivery still has to be confirmed by the delivery document code first.';

    // Case A: the chat claims the gated milestone itself, moving forward.
    if (phase !== 'skipped' && source === 'CHAT' && gates[target] && targetRank > currentRank && !verifiedFor(ctx.job, gates[target])) {
      return {
        pass: false,
        code: 'VERIFICATION_REQUIRED',
        message: messageA(gates[target]),
        reason: `${sm.label(target)} needs a verified ${String(gates[target]).toLowerCase()} document first`,
        evidence: { kind: 'DOCUMENT', stage: gates[target] },
      };
    }
    // Case B: a forward move would skip over an unverified gate.
    const skipped =
      phase === 'direct'
        ? null
        : sm.inferredStatesBetween(currentRank, target).find((s) => gates[s] && !verifiedFor(ctx.job, gates[s]));
    if (skipped && source !== 'MANAGER') {
      return {
        pass: false,
        code: 'VERIFICATION_REQUIRED',
        message: messageB(gates[skipped]),
        reason: `the ${String(gates[skipped]).toLowerCase()} document must be verified before the job can move this far`,
        evidence: { kind: 'DOCUMENT', stage: gates[skipped] },
      };
    }
    return { pass: true };
  },
});
