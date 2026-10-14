/** The organization to use for a system caller that has none of its own (a timer, a script): the oldest one. Looked up once. */
const { prisma } = require('./db');

let cached = null;

async function defaultOrganizationId() {
  if (cached) return cached;
  try {
    cached = (await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id ?? null;
  } catch {
    cached = null; // no organization to read config for; nothing matches a null id
  }
  return cached;
}

module.exports = { defaultOrganizationId };
