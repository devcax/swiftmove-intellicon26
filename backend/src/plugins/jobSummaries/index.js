/**
 * Keeps the short running summary of a driver's trip up to date, for the AI to read as context. It reacts to events: a driver accepting a
 * job starts the summary, and the bot finishing with a driver's message may refresh it. Refreshing asks the language model, so it is
 * slow and may fail; the event is retried, and a repeat is harmless because a refresh with no new messages does nothing.
 */
const { chatCompletion } = require('../../platform/llm');

const NEW_MESSAGES_THRESHOLD = 8;
const STALE_AFTER_MS = 12 * 3600 * 1000;
const MAX_MESSAGE_CHARS = 240;

const SUMMARY_SYSTEM_PROMPT = `You maintain the rolling operations summary of ONE active delivery trip for a logistics fleet.
You receive the previous summary plus the newest WhatsApp messages of the trip. Produce the UPDATED summary:
- Keep it under 200 words, factual, third person, plain text (no markdown, no headings).
- Preserve key facts: milestones reached, quantities/seals, delays, incidents, documents received, verifications, and anything still open.
- Fold in the new messages; drop detail that is now obsolete.
- Never invent facts that are not in the summary or the messages.
Reply with the updated summary text only.`;

function cleanSummary(raw) {
  return String(raw ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```(?:md|markdown)?/gi, '')
    .trim();
}

/** accepted offer: the job starts with an empty summary for this driver. */
async function startSummary({ event, run }) {
  const { jobId, driverId } = event.payload;
  try {
    await run('summary.ensure', { jobId, driverId });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return;
    throw err;
  }
}

/** The bot finished with a message: refresh the summary when something happened or enough has piled up. */
async function refreshSummary({ event, run, query, chat = chatCompletion, now = Date.now }) {
  const { driverId, conversationId } = event.payload;
  const state = await query('summary.state', { driverId, conversationId });
  if (!state || state.newCount === 0) return { skipped: 'NOTHING_NEW' };
  if (!state.hasRow) await run('summary.ensure', { jobId: state.jobId, driverId });
  const stale = state.updatedAt ? now() - new Date(state.updatedAt).getTime() > STALE_AFTER_MS : false;
  if (!state.eventApplied && state.newCount < NEW_MESSAGES_THRESHOLD && !stale) return { skipped: 'NOT_YET' };

  const transcript = state.messages
    .map((m) => `${m.sender_type}: ${(m.body_text ?? `[${m.message_type}]`).slice(0, MAX_MESSAGE_CHARS)}`)
    .join('\n');
  const userPrompt = [
    `PREVIOUS SUMMARY:\n"""${state.summaryText || '(none yet — this trip just started)'}"""`,
    `NEW MESSAGES:\n"""\n${transcript}\n"""`,
    'Return the updated summary now.',
  ].join('\n\n');
  const text = cleanSummary(await chat({
    messages: [{ role: 'system', content: SUMMARY_SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
    temperature: 0,
    maxTokens: 300,
  }));
  if (!text) return { skipped: 'EMPTY' };
  await run('summary.save', { jobId: state.jobId, text, lastMessageId: state.lastMessageId, newCount: state.newCount });
  return { saved: true };
}

function register({ subscribe }) {
  subscribe('offer.accepted', 'jobSummaries.start', startSummary);
  subscribe('conversation.messageHandled', 'jobSummaries.refresh', refreshSummary);
}

module.exports = { name: 'jobSummaries', register, startSummary, refreshSummary, cleanSummary };
