const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const { lookupAddress } = require('../../../platform/locationAddress');

module.exports = defineQuery({
  name: 'job.locationAddress',
  description: 'Resolve a selected map pin to a readable pickup or delivery address.',
  roles: ['ADMIN', 'MANAGER'],
  input: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }),
  handler: async ({ input }) => lookupAddress(input),
});
