/** A location the driver shared: it answers a flow's question or the safety check, or is just noted. */
const flowEngine = require("./flows/engine");
const { reply } = require("./reply");
const { getPendingAction } = require("./pending");
const { flowDeps } = require("./flows/deps");
const { applySafetyCheck, findOpenSafetyIncident } = require("./safety");
const driverActions = require("./driverActions");

async function handleLocation(ctx, text) {
  const { d, conversationId } = ctx;
  const pendingLoc = await getPendingAction(conversationId);
  if (pendingLoc?.type === flowEngine.PENDING_TYPE) {
    const flow = await flowEngine.loadFlowVersion(
      d.organization_id,
      pendingLoc.flowKey,
      pendingLoc.flowVersion,
    );
    const step = flow && flowEngine.currentStep(flow, pendingLoc);
    if (step?.type === "ASK_LOCATION") {
      const m = text.match(/-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/);
      if (!m) {
        return await reply({
          ...ctx,
          body: "Hmm, I couldn't read that location, use the attachment menu in WhatsApp and choose Location to share your position.",
        });
      }
      const [lat, lng] = m[0].split(",").map((s) => s.trim());
      const outcome = await flowEngine.advanceFlow(
        flowDeps(ctx),
        flow,
        pendingLoc,
        { location: { lat, lng } },
        ctx,
      );
      if (outcome.handled) return { flow: pendingLoc.flowKey };
    }
  }
  if (["AWAITING_LOCATION", "AWAITING_BACKUP"].includes(pendingLoc?.type)) {
    const m = text.match(/-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/);
    if (!m) {
      return await reply({
        ...ctx,
        body: "Hmm, I couldn't read that location, use the attachment menu in WhatsApp and choose Location to share your position.",
      });
    }
    const [lat, lng] = m[0].split(",").map((s) => s.trim());
    return await applySafetyCheck(ctx, pendingLoc, { lat, lng });
  }
  const incident = await findOpenSafetyIncident(d.id);
  if (incident) {
    const m = text.match(/-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/);
    if (m) {
      const [lat, lng] = m[0].split(",").map((s) => s.trim());
      await driverActions.recordSafetyFollowup(d, { incidentId: incident.id, lat: Number(lat), lng: Number(lng) });
    }
    return await reply({
      ...ctx,
      body: "Got it, the manager can see where you are now.",
    });
  }
  return await reply({ ...ctx, body: "Location noted, thanks!" });
}

module.exports = { handleLocation };
