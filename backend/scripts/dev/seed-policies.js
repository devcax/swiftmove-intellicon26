/**
 * Seed the built-in operational policies (src/modules/policies/seeds.js) for every organization, as PUBLISHED version 1.
 * Idempotent: it inserts only what an organization does not have yet, so manager edits, pauses and archives are never overwritten.
 * The policy store version moves on for an organization that received rows, so running backends re-read the policies.
 *
 * Usage: npm run db:seed-policies   (or part of npm run db:seed)
 */
require('dotenv').config();
const { prisma } = require('../../src/platform/db');
const { buildPolicySeeds } = require('../../src/modules/policies/seeds');

async function seedPolicies(db) {
  const organizations = await db.organization.findMany({ select: { id: true }, orderBy: { createdAt: 'asc' } });
  const seeds = buildPolicySeeds();
  let total = 0;
  for (const { id: organizationId } of organizations) {
    const { count } = await db.policyDefinition.createMany({
      data: seeds.map((seed) => ({
        organizationId, key: seed.key, name: seed.name, description: seed.description ?? null, action: seed.action, enforcement: seed.enforcement,
        match: seed.match ?? {}, rule: seed.rule, onBlock: seed.onBlock ?? { mode: 'BLOCK' }, position: seed.position ?? 100, version: 1,
        status: 'PUBLISHED', enabled: seed.enabled !== false, isSystem: true,
      })),
      skipDuplicates: true,
    });
    if (count > 0) {
      await db.policyStoreMeta.upsert({
        where: { organizationId }, create: { organizationId, version: 1 }, update: { version: { increment: 1 }, updatedAt: new Date() },
      });
    }
    total += count;
    const present = (await db.policyDefinition.findMany({ where: { organizationId, isSystem: true, status: { not: 'ARCHIVED' } }, distinct: ['key'], select: { key: true } })).length;
    console.log(`org ${organizationId}: ${present}/${seeds.length} built-in policies present (${count} inserted this run)`);
  }
  return total;
}

module.exports = { seedPolicies };

if (require.main === module) {
  prisma.$transaction((tx) => seedPolicies(tx), { timeout: 60_000 })
    .then((total) => console.log(`Policy seeding complete (${total} rows inserted).`))
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
