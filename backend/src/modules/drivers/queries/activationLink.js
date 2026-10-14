const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const repo = require('../repo');

// The link is a secret that proves a phone number: only the system (the notifications plugin that sends it) may read it, never a manager
// or the assistant, otherwise a number could be "verified" by someone who does not hold the phone.
module.exports = defineQuery({
  name: 'driver.activationLink',
  description: 'The open activation link of a driver, for the system to send to their WhatsApp.',
  roles: ['ADMIN'],
  actors: ['SYSTEM'],
  input: z.object({ driverId: z.guid() }).strict(),
  handler: async ({ input, db }) => {
    const open = await repo.findOpenActivation(db, input.driverId);
    if (!open) return null;
    return { token: open.token, expiresAt: open.expiresAt, phone: open.account.phoneE164, name: open.account.driver.name };
  },
});
