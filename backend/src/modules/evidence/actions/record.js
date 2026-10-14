const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const { AuthorizationError, NotFoundError, ValidationError } = require('../../../platform/errors');
const { recordSchema, storedValue } = require('../schemas');
const { presentEvidence } = require('../present');
const repo = require('../repo');

/** Who may record what, then lock the subject. A driver can only speak for themselves; only a manager can approve. */
async function load({ input, actor, tx }) {
  if (input.type === 'APPROVAL' && actor.type !== 'MANAGER') throw new AuthorizationError('Only a manager can approve.');
  if (actor.type === 'DRIVER' && input.subjectType === 'JOB') throw new AuthorizationError('You cannot record evidence for that.');
  if (actor.type === 'DRIVER' && input.subjectType === 'DRIVER' && input.subjectId !== actor.driverId) {
    throw new AuthorizationError('You can only record evidence about yourself.');
  }
  if (input.subjectType === 'DRIVER' && !(await lockRow(tx, 'drivers', input.subjectId, actor.organizationId))) {
    throw new NotFoundError('Driver not found.');
  }
  if (input.subjectType === 'JOB' && !(await lockRow(tx, 'jobs', input.subjectId, actor.organizationId))) {
    throw new NotFoundError('Job not found.');
  }
  if (input.attachmentId && !(await repo.attachmentBelongsTo(tx, actor.organizationId, input.attachmentId))) {
    throw new ValidationError('That file was not found.', { details: [{ path: 'attachmentId', message: 'That file was not found.' }] });
  }
  return { subject: { type: 'EVIDENCE', id: input.subjectId } };
}

module.exports = defineAction({
  name: 'evidence.record',
  title: 'Record evidence',
  description: 'Record proof for a driver or a job: a document, a confirmation, a note, a location or a manager\'s approval.',
  actors: ['MANAGER', 'DRIVER', 'SYSTEM'],
  roles: ['ADMIN', 'MANAGER'],
  input: recordSchema,
  load,
  handler: async ({ input, actor, tx }) => {
    const row = await repo.insertEvidence(tx, actor.organizationId, {
      subjectType: input.subjectType, subjectId: input.subjectId, name: input.name, type: input.type,
      value: storedValue(input, actor), attachmentId: input.attachmentId ?? null, recordedByType: actor.type,
      recordedById: actor.userId ?? actor.driverId ?? null, source: actor.source ?? 'UNKNOWN',
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });
    return {
      result: presentEvidence(row),
      events: [{ type: 'evidence.recorded', payload: { evidenceId: row.id, subjectType: row.subjectType, subjectId: row.subjectId, name: row.name } }],
      subject: { type: 'EVIDENCE', id: row.id },
    };
  },
});
