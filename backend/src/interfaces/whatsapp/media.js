/** A voice note, a photo or a document the driver sent. A voice note becomes text; a photo or document is read, or answers a flow's question. */
const flowEngine = require("./flows/engine");
const { reply } = require("./reply");
const { getPendingAction } = require("./pending");
const { flowDeps } = require("./flows/deps");
const { transcribeVoiceMessage } = require("./voice");
const { handleInboundImage } = require("./documents");
const { prepareDocumentContext } = require("./attachments");

/** A voice note: `{ text }` with what was said, or `{ result }` when it could not be understood (and the driver was told). */
async function handleVoice(ctx) {
  const transcript = await transcribeVoiceMessage(ctx.messageId);
  if (!transcript) {
    return {
      result: await reply({
        ...ctx,
        body: `I got your voice note but couldn't make it out, mind typing it, or sending a clearer recording?`,
      }),
    };
  }
  await reply({ ...ctx, body: `I heard: "${transcript}"` });
  return { text: transcript };
}

/** A photo or document: `{ result }` when it was dealt with, otherwise `{ text }` (the caption, possibly empty) for the rest of the handling. */
async function handleMedia(ctx, captionText) {
  const { d, messageId, conversationId } = ctx;
  let text = captionText;
  if (/^\[(image|document)\]$/i.test(text)) text = "";
  const pendingImg = await getPendingAction(conversationId);
  if (pendingImg?.type === flowEngine.PENDING_TYPE) {
    const flow = await flowEngine.loadFlowVersion(
      d.organization_id,
      pendingImg.flowKey,
      pendingImg.flowVersion,
    );
    const step = flow && flowEngine.currentStep(flow, pendingImg);
    if (step?.type === "ASK_PHOTO") {
      const outcome = await flowEngine.advanceFlow(
        flowDeps(ctx),
        flow,
        pendingImg,
        { photo: { messageId } },
        ctx,
      );
      if (outcome.handled) return { result: { flow: pendingImg.flowKey } };
    }
  }
  const handled = await handleInboundImage(ctx, text || null);
  if (handled) return { result: handled };
  const doc = await prepareDocumentContext(ctx, text || null);
  if (doc?.needsJobChoice) {
    return {
      result: await reply({
        ...ctx,
        body: "Which job is this for? Tap below",
        listRows: doc.jobRows,
      }),
    };
  }
  if (doc) {
    ctx.document = doc;
    if (!text) return { result: await reply({ ...ctx, body: doc.confirmation }) };
  }
  return { text };
}

module.exports = { handleVoice, handleMedia };
