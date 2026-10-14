const { defineAction } = require('../../../platform/registry');
const { createSchema } = require('../schemas');
const { presentDriver } = require('../present');
const { attachEvidence } = require('../../../platform/evidence');
const repo = require('../repo');

module.exports = defineAction({
  name: 'driver.create',
  title: 'Add a driver',
  description: 'Add a driver with a name, WhatsApp number, vehicle and licence plate. Address, NIC, date of birth and bank details are optional. An activation link is sent to their WhatsApp; the number is verified, and they are welcomed, once they open it.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: createSchema,
  // Policies can ask for evidence (a birth certificate) before the driver exists: it is looked up under the evidenceRef.
  load: async ({ input }) => ({ params: { evidenceRef: input.evidenceRef } }),
  handler: async ({ input, actor, tx }) => {
    const created = await repo.insertDriver(tx, actor.organizationId, input);
    if (input.evidenceRef) {
      await attachEvidence(tx, { organizationId: actor.organizationId, evidenceRef: input.evidenceRef, subjectType: 'DRIVER', subjectId: created.id });
    }
    await repo.issueActivation(tx, created.driverWhatsappAccounts[0].id);
    const row = await repo.findDriver(tx, actor.organizationId, created.id);
    return {
      result: presentDriver(row),
      events: [
        { type: 'driver.created', payload: { driverId: created.id } },
        { type: 'driver.activationRequested', payload: { driverId: created.id } },
      ],
      subject: { type: 'DRIVER', id: created.id },
    };
  },
});
