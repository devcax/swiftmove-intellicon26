const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const { firstName } = require('../../../platform/names');
const repo = require('../repo');

/** What a link is right now, for the public activation page: nothing about the driver beyond their first name. */
module.exports = defineQuery({
  name: 'driver.activationLookup',
  description: 'Say whether an activation link can still be used, for the public activation page.',
  roles: ['ADMIN'],
  actors: ['SYSTEM'],
  input: z.object({ token: z.string().min(16).max(64) }).strict(),
  handler: async ({ input, db }) => {
    const activation = await repo.findActivation(db, input.token);
    if (!activation) return { state: 'invalid' };
    const { driver } = activation.account;
    const base = { driverId: driver.id, organizationId: driver.organizationId, firstName: firstName(driver.name) };
    if (activation.account.verificationStatus === 'VERIFIED') return { ...base, state: 'verified' };
    if (activation.usedAt || activation.expiresAt < new Date()) return { ...base, state: 'expired' };
    return { ...base, state: 'ready' };
  },
});
