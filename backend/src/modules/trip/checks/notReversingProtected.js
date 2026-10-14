const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');
const sm = require('../../../platform/jobStateMachine');

const PROTECTABLE_STATUSES = [
  'ASSIGNED', 'IN_PROGRESS', 'ARRIVED_AT_PICKUP', 'LOADING_STARTED', 'LOADED',
  'DEPARTED', 'ARRIVED_AT_DELIVERY', 'UNLOADING_STARTED', 'DELIVERED', 'COMPLETED',
];

module.exports = defineCheck({
  name: 'not_reversing_protected',
  label: 'Confirmed milestones cannot be rolled back',
  description:
    'Once any of these milestones is confirmed, the driver cannot move the job back behind it ' +
    '(managers may still correct it).',
  actions: ['trip.milestone'],
  params: z.object({ milestones: z.array(z.enum(PROTECTABLE_STATUSES)) }),
  paramSpec: [{ name: 'milestones', label: 'protected milestones', kind: 'enumList', values: PROTECTABLE_STATUSES, required: true }],
  dataDependencies: ['workflow_events', 'job_assignments', 'jobs'],
  evaluate: async (ctx, params) => {
    const source = ctx.params.source ?? 'CHAT';
    if (source === 'MANAGER' || !ctx.job) return { pass: true };
    const target = ctx.params.milestone;
    const targetRank = sm.MILESTONE_RANK[target];
    if (targetRank == null) return { pass: true };
    const milestones = Array.isArray(params.milestones) ? params.milestones : [];
    const ranks = milestones.map((s) => sm.STAGE_RANK[s]).filter((r) => r != null).sort((a, b) => a - b);

    // Rank-based floor (what the state machine sees) ...
    const currentRank = ctx.currentRank ?? 0;
    let floor = sm.protectionFloor(currentRank, ranks);
    // ... and the database floor (confirmed events, live assignment, verifications),
    // which the chat path has always enforced. This is a byte-faithful port of
    // workflow.protectionFloorRank. The context builders load the rows it reads
    // (appliedEventTypes, jobAssignment); a check never touches the database.
    if (source === 'CHAT' && ctx.appliedEventTypes) {
      let dbFloor = -1;
      for (const type of ctx.appliedEventTypes) {
        if (milestones.includes(type)) dbFloor = Math.max(dbFloor, sm.STAGE_RANK[type] ?? -1);
      }
      if (ctx.jobAssignment) {
        dbFloor = Math.max(dbFloor, sm.STAGE_RANK.ASSIGNED);
        if (ctx.jobAssignment.started_at) dbFloor = Math.max(dbFloor, sm.STAGE_RANK.IN_PROGRESS);
      }
      if (ctx.job.pickup_verified_at) dbFloor = Math.max(dbFloor, sm.STAGE_RANK.LOADED);
      if (ctx.job.delivery_verified_at) dbFloor = Math.max(dbFloor, sm.STAGE_RANK.DELIVERED);
      floor = Math.max(floor, dbFloor);
    }

    if (targetRank < floor) {
      const milestone = sm.floorMilestone(floor, milestones) ?? sm.floorMilestone(floor, sm.PROTECTED_MILESTONES);
      return {
        pass: false,
        code: 'PROTECTED_MILESTONE',
        message: `This job is already confirmed as ${sm.label(milestone)}, so it cannot go back to ${sm.label(target)}.`,
        reason: `the job is already confirmed as ${sm.label(milestone)}`,
      };
    }
    return { pass: true };
  },
});
