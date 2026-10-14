/**
 * Topic router for general driver questions.
 *
 * Several conversation flows can share the GENERAL_QUESTION intent trigger by
 * each owning a topic slug (e.g. "water", "working-hours"). When such a
 * question arrives, this classifier picks the single best-fitting topic and
 * the bot starts that flow; a topic-less GENERAL_QUESTION flow is the default
 * for questions no topic claims. The topic list always comes from published
 * flows (code-controlled), so the AI only ever chooses among manager-made
 * options — it can never invent a destination. Failures degrade to the
 * default flow or the legacy freeform answer, never to a crash.
 *
 * The prompt is an AI instruction (flow.topic_router) so it can be tuned from
 * the dashboard like the other prompts.
 */
const { logger } = require('../../../platform/logger');
const { chatJson } = require('../../../platform/llm');
const { getInstruction } = require('../../../platform/instructions');
const { prompts: { TOPIC_ROUTER_PROMPT } } = require('../../../modules/aiInstructions');

/**
 * Pick the topic a general question is about.
 * @returns {Promise<string|null>} the chosen topic id, or null when nothing
 *          fits ("other") or the routing failed — callers then fall back to
 *          the default flow / legacy freeform answer.
 */
async function routeTopic({
  text,
  topics,
  organizationId = null,
  chat = chatJson,
  resolveInstruction = getInstruction,
}) {
  if (!Array.isArray(topics) || topics.length === 0) return null;
  const list = topics.map((t) => `- ${t.id}: ${t.description}`).join('\n');
  try {
    const system =
      (await resolveInstruction(organizationId, 'flow.topic_router')) ??
      TOPIC_ROUTER_PROMPT;
    const result = await chat({
      system,
      user: `Topics:\n${list}\n\nDriver message: """${String(text ?? '').slice(0, 500)}"""`,
      maxTokens: 60,
    });
    const id = String(result?.topic ?? '').trim();
    if (topics.some((t) => t.id === id)) return id;
    return null; // explicit "other" or an id the model invented
  } catch (err) {
    logger.warn({ err }, 'Topic routing failed, falling back to the default flow');
    return null;
  }
}

module.exports = { TOPIC_ROUTER_PROMPT, routeTopic };
