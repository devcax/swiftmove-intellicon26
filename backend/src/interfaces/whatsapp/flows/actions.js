/**
 * The whitelisted system functions a flow definition can invoke from an ACTION step (a manager picks them by name in the dashboard; they can
 * never write code). Each mirrors the conversation code that existed before flows were editable, so a built-in flow behaves exactly like it.
 * Signature: async (ctx, params, data, refs) => undefined | { goto } | { end } | { retry }.
 *
 * Every change to a job goes through the action runner as the driver (the `driverActions` calls); an action here only decides what to
 * say and what to do next.
 */
const { actionsSafety } = require("./actionsSafety");
const { actionsTrip } = require("./actionsTrip");
const { actionsJobs } = require("./actionsJobs");
const { actionsRoute } = require("./actionsRoute");
const { actionsEvidence } = require("./actionsEvidence");

const flowActions = { ...actionsSafety, ...actionsTrip, ...actionsJobs, ...actionsRoute, ...actionsEvidence };

module.exports = { flowActions };
