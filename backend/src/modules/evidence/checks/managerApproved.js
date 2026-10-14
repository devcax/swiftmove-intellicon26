const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');
const { humanize } = require('./words');

module.exports = defineCheck({
  name: 'manager_approved',
  label: 'A manager approved this',
  description:
    'A manager must approve before the action can continue. A driver cannot satisfy this themselves — ' +
    'the conversation goes into a waiting state and the manager is notified.',
  actions: '*',
  params: z.object({ name: z.string().min(2).max(60).optional() }).strict(),
  // With a name, only an approval recorded under that name counts; without one, any approval for the subject does.
  paramSpec: [{ name: 'name', label: 'what is approved (like driver_documents)', kind: 'string', required: false }],
  dataDependencies: ['evidence'],
  evidence: { kind: 'MANAGER_REVIEW' },
  // A manager's approval cannot be collected in a form: it is shown as a notice.
  requirement: () => null,
  notice: (params) => `A manager has to approve${params.name ? ` the ${humanize(params.name)}` : ' this'} before it can go ahead.`,
  evaluate: async (ctx, params) => {
    // Older callers pass the approval as a parameter; that still counts.
    if (ctx.params?.managerApproval === true) return { pass: true };
    const rows = [...(ctx.evidence?.job ?? []), ...(ctx.evidence?.driver ?? []), ...(ctx.evidence?.pending ?? [])];
    const approved = rows.some((row) => row.type === 'APPROVAL' && (!params.name || row.name === params.name) && (!row.expires_at || new Date(row.expires_at) > ctx.now));
    if (approved) return { pass: true };
    const what = params.name ? ` of the ${humanize(params.name)}` : '';
    return {
      pass: false,
      code: 'MANAGER_APPROVAL_REQUIRED',
      message: 'This needs a manager’s approval first. I’ve let them know — you don’t need to do anything else.',
      reason: `a manager approval${what} is required`,
      evidence: { kind: 'MANAGER_REVIEW' },
    };
  },
});
