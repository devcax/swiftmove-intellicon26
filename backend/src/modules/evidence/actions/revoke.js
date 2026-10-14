const { defineAction } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { revokeSchema } = require('../schemas');
const { presentEvidence } = require('../present');
const repo = require('../repo');

module.exports = defineAction({
  name: 'evidence.revoke',
  title: 'Withdraw evidence',
  description: 'Withdraw a piece of evidence so it no longer counts. The record stays for the audit trail.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  destructive: true,
  input: revokeSchema,
  handler: async ({ input, actor, tx }) => {
    const existing = await repo.findEvidence(tx, actor.organizationId, input.id);
    if (!existing) throw new NotFoundError('Evidence not found.');
    const changed = await repo.markRevoked(tx, actor.organizationId, input.id);
    const row = await repo.findEvidence(tx, actor.organizationId, input.id);
    return {
      result: presentEvidence(row),
      // Revoking twice is harmless and announces nothing the second time.
      events: changed.count > 0
        ? [{ type: 'evidence.revoked', payload: { evidenceId: row.id, subjectType: row.subjectType, subjectId: row.subjectId, name: row.name } }]
        : [],
      subject: { type: 'EVIDENCE', id: row.id },
    };
  },
});
