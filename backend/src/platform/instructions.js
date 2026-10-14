/**
 * The AI instruction a manager customized for an organization, or null when it uses the text built into the code. Read on every message the
 * bot handles, so it is kept for a short while; saving an instruction clears it. Callers fall back to their built-in text on null, so a
 * broken edit or an unreadable table can never stop the bot.
 */
const { prisma } = require('./db');
const config = require('./config');
const { logger } = require('./logger');
const { defaultOrganizationId } = require('./defaultOrganization');

const CACHE_TTL_MS = config.guardConfigCacheMs;
const cache = new Map(); // `${organizationId}:${key}` -> { at, value }

async function getInstruction(organizationId, key) {
  const id = organizationId ?? (await defaultOrganizationId());
  if (!id) return null;
  const cacheKey = `${id}:${key}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value = null;
  try {
    value = (await prisma.aiInstruction.findUnique({ where: { organizationId_key: { organizationId: id, key } }, select: { content: true } }))?.content ?? null;
  } catch (err) {
    logger.warn({ err }, 'ai_instructions unavailable, using the built-in prompt');
  }
  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}

/** Forget what was read for an organization (everything when none is named). */
function invalidateInstructions(organizationId = null) {
  if (!organizationId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) if (key.startsWith(`${organizationId}:`)) cache.delete(key);
}

module.exports = { getInstruction, invalidateInstructions };
