const { defineQuery } = require('../../../platform/registry');
const { emptySchema } = require('../schemas');
const { catalog } = require('../present');

module.exports = defineQuery({
  name: 'policy.catalog',
  description: 'List the building blocks a policy can use and the actions it can gate.',
  roles: ['ADMIN', 'MANAGER'],
  input: emptySchema,
  handler: async () => catalog(),
});
