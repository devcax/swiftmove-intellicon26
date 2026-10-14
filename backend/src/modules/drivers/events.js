const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');

const payload = z.object({ driverId: z.guid() });

module.exports = [
  defineEvent({ name: 'driver.created', description: 'A driver was added.', payload }),
  defineEvent({ name: 'driver.updated', description: 'A driver\'s details or status changed.', payload }),
  defineEvent({ name: 'driver.deleted', description: 'A driver was deleted.', payload }),
];
