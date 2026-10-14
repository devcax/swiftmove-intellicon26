const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');

const payload = z.object({ driverId: z.guid() });

module.exports = [
  defineEvent({ name: 'driver.created', description: 'A driver was added.', payload }),
  defineEvent({ name: 'driver.activationRequested', description: 'A driver\'s number needs to be verified: a new activation link must be sent to it.', payload }),
  defineEvent({ name: 'driver.verified', description: 'A driver opened their activation link, so their WhatsApp number is verified.', payload }),
  defineEvent({ name: 'driver.updated', description: 'A driver\'s details or status changed.', payload }),
  defineEvent({ name: 'driver.deleted', description: 'A driver was deleted.', payload }),
];
