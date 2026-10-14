/**
 * The conversation flow engine as the WhatsApp side uses it: the pure runtime (matching and running a flow definition) from the flows
 * module, plus the two reads it needs while a conversation is live (which flows are published, and the exact version a conversation
 * started on).
 */
const runner = require("../../../platform/runner");
const { runtime } = require("../../../modules/flows");

const actor = (organizationId) => ({ type: "SYSTEM", organizationId, source: "WHATSAPP" });

/** Published and enabled flows of the organization; null when they cannot be read. */
const loadFlows = (organizationId) => runner.runQuery("flow.listLive", {}, actor(organizationId));

/** One version of a flow, or null. */
const loadFlowVersion = async (organizationId, key, version) => (Number.isInteger(version) && version > 0
  ? runner.runQuery("flow.getVersion", { key, version }, actor(organizationId))
  : null);

module.exports = { ...runtime, loadFlows, loadFlowVersion };
