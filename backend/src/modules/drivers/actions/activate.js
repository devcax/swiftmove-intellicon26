const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const { AppError, NotFoundError } = require('../../../platform/errors');
const repo = require('../repo');

const schema = z.object({ token: z.string().min(16).max(64), driverId: z.guid() }).strict();

const gone = (message) => new AppError(message, { code: 'ACTIVATION_LINK_INVALID', status: 410, expose: true });

/**
 * A driver opened the link sent to their WhatsApp: the number is theirs. Only the system runs this (the public activation page);
 * a manager cannot verify a number for the driver, because the point is that the person holding the phone did it.
 */
module.exports = defineAction({
  name: 'driver.activate',
  title: 'Verify a driver\'s number',
  description: 'Verify the WhatsApp number of the driver who opened their activation link, then welcome them.',
  actors: ['SYSTEM'],
  input: schema,
  load: async ({ input, actor, tx }) => {
    if (!(await lockRow(tx, 'drivers', input.driverId, actor.organizationId))) throw new NotFoundError('Driver not found.');
    return { driverId: input.driverId, subject: { type: 'DRIVER', id: input.driverId } };
  },
  handler: async ({ input, tx }) => {
    const activation = await repo.findActivation(tx, input.token);
    if (!activation || activation.account.driver.id !== input.driverId) throw gone('This activation link is not valid.');
    const subject = { type: 'DRIVER', id: input.driverId };
    if (activation.account.verificationStatus === 'VERIFIED') return { result: { ok: true, alreadyVerified: true }, events: [], subject };
    if (activation.usedAt || activation.expiresAt < new Date()) throw gone('This activation link has expired. Ask your fleet manager to send a new one.');
    await repo.markVerified(tx, activation);
    return { result: { ok: true, alreadyVerified: false }, events: [{ type: 'driver.verified', payload: { driverId: input.driverId } }], subject };
  },
});
