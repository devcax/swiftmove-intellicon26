const { logger } = require('../../../platform/logger');
const { promptGuardScore } = require('../../../platform/llm');
const config = require('../../../platform/config');
const { defaultOrganizationId } = require('../../../platform/defaultOrganization');
const { getPolicySetting } = require('../../../platform/policy/store');

const GUARD_THRESHOLD = config.aiGuardThreshold;

async function screenMessage(text, organizationId = null) {
  try {
    const orgId = organizationId ?? (await defaultOrganizationId());
    const setting = await getPolicySetting(orgId, 'security.prompt-screening', { threshold: GUARD_THRESHOLD });
    const configured = Number(setting.threshold);
    const promptThreshold = Number.isFinite(configured) ? configured : GUARD_THRESHOLD;
    const score = await promptGuardScore(text);
    return { safe: score < promptThreshold, score };
  } catch (err) {
    logger.warn({ err }, 'Prompt guard unavailable, failing open');
    return { safe: true, score: null };
  }
}

module.exports = { screenMessage, GUARD_THRESHOLD };
