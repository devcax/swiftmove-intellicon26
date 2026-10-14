const { defineQuery } = require('../../../platform/registry');
const { emptySchema } = require('../schemas');
const { generateJobNumber, generateSecurityCode } = require('../identifiers');

module.exports = defineQuery({
  name: 'job.nextIdentifiers',
  description: 'A fresh job number and pickup and delivery security codes for the new-job form to suggest.',
  roles: ['ADMIN', 'MANAGER'],
  input: emptySchema,
  handler: async () => ({ jobNumber: generateJobNumber(), pickupCode: generateSecurityCode('PU'), deliveryCode: generateSecurityCode('DL') }),
});
