const { defineAction } = require('../../../platform/registry');
const { ConflictError, NotFoundError } = require('../../../platform/errors');
const { idSchema } = require('../schemas');
const { lockDriver } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'driver.resendActivation',
  title: 'Send the activation link again',
  description: 'Send a driver a fresh activation link on WhatsApp. The link sent before stops working. Not needed once their number is verified.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  load: lockDriver,
  handler: async ({ input, tx }) => {
    const account = await repo.findPrimaryAccount(tx, input.id);
    if (!account) throw new NotFoundError('This driver has no WhatsApp number yet.');
    if (account.verificationStatus === 'VERIFIED') throw new ConflictError('This number is already verified.');
    await repo.issueActivation(tx, account.id);
    return {
      result: { ok: true },
      events: [{ type: 'driver.activationRequested', payload: { driverId: input.id } }],
      subject: { type: 'DRIVER', id: input.id },
    };
  },
});
