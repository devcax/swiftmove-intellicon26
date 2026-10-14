/**
 * Seed the built-in conversation flows (src/modules/flows/seeds.js) for every organization, as PUBLISHED version 1.
 * Idempotent, like the policy seeder: it inserts only what an organization is missing and never overwrites manager edits.
 * A seed the validator would reject is a mistake in the code, so seeding stops with the problems listed.
 *
 * Usage: npm run db:seed-flows   (or part of npm run db:seed)
 */
require('dotenv').config();
const { prisma } = require('../../src/platform/db');
const { FLOW_SEEDS } = require('../../src/modules/flows/seeds');
const { validateFlow } = require('../../src/modules/flows/flowValidate');
const { ACTION_NAMES, PROMPT_PROVIDER_NAMES } = require('../../src/modules/flows/vocabulary');

async function seedFlows(db) {
  for (const seed of FLOW_SEEDS) {
    const { ok, errors } = validateFlow(seed.definition, { actions: ACTION_NAMES, promptProviders: PROMPT_PROVIDER_NAMES });
    if (!ok) throw new Error(`Seed flow "${seed.key}" is invalid:\n${errors.map((e) => `  - [${e.step ?? 'flow'}] ${e.message}`).join('\n')}`);
  }
  const organizations = await db.organization.findMany({ select: { id: true }, orderBy: { createdAt: 'asc' } });
  let total = 0;
  for (const { id: organizationId } of organizations) {
    const { count } = await db.flowDefinition.createMany({
      data: FLOW_SEEDS.map((flow) => ({
        organizationId, key: flow.key, name: flow.name, description: flow.description ?? null, version: 1, status: 'PUBLISHED',
        triggerType: flow.triggerType, triggerConfig: flow.triggerConfig ?? {}, definition: flow.definition, isSystem: true, enabled: true,
      })),
      skipDuplicates: true,
    });
    total += count;
    const present = (await db.flowDefinition.findMany({ where: { organizationId, isSystem: true, status: 'PUBLISHED' }, distinct: ['key'], select: { key: true } })).length;
    console.log(`org ${organizationId}: ${present}/${FLOW_SEEDS.length} built-in flows present (${count} inserted this run)`);
  }
  return total;
}

module.exports = { seedFlows };

if (require.main === module) {
  prisma.$transaction((tx) => seedFlows(tx), { timeout: 60_000 })
    .then((total) => console.log(`Flow seeding complete (${total} rows inserted).`))
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
