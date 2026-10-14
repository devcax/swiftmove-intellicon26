/**
 * Register a driver and a WhatsApp number so inbound webhook messages are recognized (the same way the dashboard adds one).
 *
 * Usage: npm run db:add-driver -- "Nuwan Perera" "+94778124590" "Van" "ED-1234"
 */
require('dotenv').config();
const { prisma } = require('../../src/platform/db');
const { registerAllModules } = require('../../src/modules/register');
const runner = require('../../src/platform/runner');

async function main() {
  const [name, phone, vehicleType = 'Van', licensePlate = 'ED-1234'] = process.argv.slice(2);
  if (!name || !phone) {
    console.error('Usage: npm run db:add-driver -- "Driver Name" "+94778124590" ["Vehicle type"] ["ED-1234"]');
    process.exitCode = 1;
    return;
  }
  registerAllModules();
  const user = await prisma.user.findFirst({ where: { userRoles: { some: { role: { code: 'ADMIN' } } } }, orderBy: { createdAt: 'asc' }, select: { id: true, organizationId: true } });
  if (!user) throw new Error('There is no admin user yet. Create one with: npm run user:create');
  const actor = { type: 'MANAGER', userId: user.id, organizationId: user.organizationId, roles: ['ADMIN'], source: 'GUI' };
  const { result } = await runner.run('driver.create', { name, phone, vehicleType, licensePlate }, actor);
  console.log(`Driver "${result.name}" registered with WhatsApp ${result.phone} (id: ${result.id})`);
}

main()
  .catch((err) => { console.error(err.details?.[0]?.message ?? err.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
