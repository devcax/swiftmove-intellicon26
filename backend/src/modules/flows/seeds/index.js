/**
 * Seed definitions for the built-in conversation flows.
 *
 * Each seed reproduces one hardcoded bot.js flow with exact behavioral
 * parity (same WhatsApp texts, button labels and branches). They are kept in
 * JS — not SQL — so the parity tests can import them directly;
 * scripts/seed-flows.js inserts them as PUBLISHED is_system rows. Managers
 * can edit them from the dashboard (new versions); bot.js falls back to its
 * legacy code only when the database table is unreadable.
 *
 * Placeholders in texts: {key} from the flow data bag, with |lower / |upper
 * filters. ACTION params starting with "$" resolve to raw references
 * (flow data, $candidate, $text, $buttonId, $buttonParam, $optionId,
 * $optionParam, $lat, $lng) instead of templated strings.
 */

const groups = [require('./trip'), require('./incident'), require('./jobs'), require('./conversation')];
const ORDER = [
  'cancellation.request',
  'delay.reason',
  'incident.safety',
  'job.start-confirm',
  'job.end-confirm',
  'job.browse',
  'job.request',
  'job.choose',
  'job.doc-choice',
  'candidate.confirm',
  'candidate.clarify',
  'job.apply',
  'offer.response',
  'job.gap-start',
  'freeform.answer',
];

const byKey = new Map(groups.flatMap((group) => group.SEEDS).map((seed) => [seed.key, seed]));
/** The built-in flows, in the order they have always been listed. */
const FLOW_SEEDS = ORDER.map((key) => byKey.get(key));

module.exports = { FLOW_SEEDS };
