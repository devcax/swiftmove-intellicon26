const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const { NotFoundError } = require('../../../platform/errors');
const repo = require('../repo');

const schema = z.object({ driverId: z.guid(), waId: z.string().regex(/^\d{5,20}$/, 'The WhatsApp number must be digits.') });

module.exports = defineAction({
  name: 'driver.recordWhatsappActivity',
  title: 'Note that a driver wrote on WhatsApp',
  description: 'Record the time of the driver\'s latest message on the WhatsApp number it came from.',
  actors: ['SYSTEM'],
  input: schema,
  load: async ({ input, actor, tx }) => {
    if (!(await lockRow(tx, 'drivers', input.driverId, actor.organizationId))) throw new NotFoundError('Driver not found.');
    return { driverId: input.driverId, subject: { type: 'DRIVER', id: input.driverId } };
  },
  handler: async ({ input, tx }) => {
    await repo.noteWhatsappActivity(tx, input.driverId, input.waId);
    return { result: { ok: true }, events: [], subject: { type: 'DRIVER', id: input.driverId } };
  },
});
