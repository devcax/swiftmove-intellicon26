/** A photo or document the driver sent: what the AI sees in it, and what its code proves about the pickup or the delivery. */
const { logger } = require("../../platform/logger");
const vision = require("./ai/vision");
const documentCode = require("./ai/documentCode");
const driverActions = require("./driverActions");
const { fmtWhen } = require("../../platform/time");
const { reply } = require("./reply");
const { setPendingAction } = require("./pending");
const { tryStartEventFlow } = require("./flows/deps");
const { verifiedDocumentReply } = require("./text");
const repo = require("./repo");

async function handleInboundImage(ctx, caption) {
  const { d, messageId } = ctx;
  const attachment = await repo.findFirstPicture(messageId);
  if (!attachment) return null;

  const imageUrl = attachment.publicUrl ?? null;
  const visionResult = await vision.analyzeAttachment(attachment.id, caption);

  if (!visionResult) {
    const stageDoc = await handleStageDocument(ctx, {
      attachment,
      imageUrl,
      stage: null,
      caption,
    });
    return stageDoc;
  }

  if (["ACCIDENT", "BREAKDOWN", "DAMAGE"].includes(visionResult.scene_class)) {
    const assignment = await driverActions.getDriverAssignment(d.id);
    if (!assignment || assignment.status !== "ACTIVE") return null;
    const { job, incidentType, severity, alreadyReported } =
      await driverActions.reportIncident(d, {
        incidentType: visionResult.scene_class,
        severity: visionResult.severity_hint,
        description:
          visionResult.description ||
          `${visionResult.scene_class} detected in driver photo`,
        data: { source: "VISION" },
        messageId,
        confidence: 1,
        imageUrl,
        attachmentId: attachment.id,
      });
    const emergency =
      severity === "CRITICAL"
        ? " If anyone is hurt or in danger, call emergency services first."
        : "";
    return await reply({
      ...ctx,
      body: alreadyReported
        ? `I added that photo to the existing ${incidentType.toLowerCase()} report for *${job.job_number}*.${emergency} Tell me what changed, and share your location here if you need help.`
        : `I saw that photo, I've logged a ${incidentType.toLowerCase()} report on *${job.job_number}* and alerted the manager (severity ${severity}).${emergency} Tell me what happened, and if you can, share your location here so we can get help to you faster.`,
    });
  }

  const detectedCodes = Array.isArray(visionResult.detected_codes)
    ? visionResult.detected_codes
        .map((code) => String(code).trim().toUpperCase())
        .filter(Boolean)
    : [];
  const documentScene = ["PICKUP_PAPER", "DELIVERY_PAPER", "POD"].includes(
    visionResult.scene_class,
  );
  let initialExtraction =
    detectedCodes.length > 0
      ? {
          outcome: documentCode.OUTCOME.OK,
          codes: detectedCodes,
          jobNumber: visionResult.detected_job_number ?? null,
          notes: null,
          error: null,
        }
      : null;

  if (!documentScene && !initialExtraction) {
    const codeExtraction = await documentCode.extractDocumentCodes(
      attachment.id,
      caption,
    );
    if (codeExtraction.outcome === documentCode.OUTCOME.OK)
      initialExtraction = codeExtraction;
  }

  if (documentScene || initialExtraction) {
    return await handleStageDocument(ctx, {
      attachment,
      imageUrl,
      stage:
        visionResult.scene_class === "PICKUP_PAPER" ? "PICKUP" : "DELIVERY",
      caption,
      initialExtraction,
    });
  }

  return null;
}

async function handleStageDocument(
  ctx,
  {
    attachment,
    imageUrl,
    stage: hintedStage,
    caption,
    initialExtraction = null,
  },
) {
  const { d, messageId } = ctx;

  const assignment = await driverActions.getDriverAssignment(d.id);
  if (!assignment) return null;

  const job = await repo.findJobForDocument(assignment.job_id);
  if (!job) return null;

  let stage = resolveDocumentStage(job, hintedStage);
  const extraction =
    initialExtraction ??
    (await documentCode.extractDocumentCodes(attachment.id, caption));

  if (extraction.outcome === documentCode.OUTCOME.TECH_FAIL) {
    logger.error({ error: extraction.error }, `Document code extraction failed for ${job.job_number}`);
    await driverActions.recordDocumentIssue(d, { jobId: job.id, messageId, stage, attachmentId: attachment.id, failure: "TECHNICAL" });
    return await reply({
      ...ctx,
      body: `I couldn't process the ${stage.toLowerCase()} document because of a technical issue on my side. Please try uploading it again.`,
    });
  }

  if (extraction.outcome === documentCode.OUTCOME.UNCLEAR) {
    await driverActions.recordDocumentIssue(d, { jobId: job.id, messageId, stage, attachmentId: attachment.id, failure: "UNREADABLE", notes: extraction.notes });
    return await reply({
      ...ctx,
      body: `I couldn't clearly read the ${stage.toLowerCase()} code from this image. Please upload a clearer photo showing the full code.`,
    });
  }

  stage = resolveDocumentStage(job, hintedStage, extraction);
  const expectedCode = stage === "PICKUP" ? job.pickup_code : job.delivery_code;
  if (!expectedCode) return null;

  // The pickup-before-delivery order is decided by the published document
  // policy inside the trip.verifyDocument action; here we only render that outcome.
  let result;
  try {
    result = await driverActions.verifyDocument(d, {
      jobId: job.id,
      stage,
      extraction,
      attachmentId: attachment.id,
      messageId,
      imageUrl,
    });
  } catch (err) {
    if (err?.code === "PICKUP_REQUIRED_FIRST") {
      await driverActions.recordDocumentIssue(d, { jobId: job.id, messageId, stage, attachmentId: attachment.id, failure: "PICKUP_REQUIRED_FIRST" });
      return await reply({
        ...ctx,
        body: `I recognized the delivery code for *${job.job_number}*, but the pickup document must be verified first. Send the pickup-code photo, then send this delivery-code photo again after the job is loaded.`,
      });
    }
    throw err;
  }

  if (!result.verified) {
    return await reply({
      ...ctx,
      body: `The ${stage.toLowerCase()} code on that document does not match the code recorded for this job, so I have not changed the job status. Please upload the correct ${stage.toLowerCase()} document.`,
    });
  }

  if (result.needsStartConfirmation) {
    const started = await tryStartEventFlow(ctx, "job.start-confirm.required", {
      candidate: null,
      source: "document",
      stage,
      jobNumber: job.job_number,
    });
    if (started) return { flow: "job.start-confirm" };
    await setPendingAction(ctx.conversationId, {
      type: "AWAITING_START_CONFIRM",
      candidate: null,
    });
    return await reply({
      ...ctx,
      body: `Your ${stage.toLowerCase()} document is verified and safely stored, so you will not need to upload it again. *${job.job_number}* has not been marked as started yet though, and I cannot move it forward until you confirm the start.`,
      buttons: [
        { id: "CONFIRM_START_JOB", title: "Confirm job started" },
        { id: "START_NOT_YET", title: "Not started yet" },
      ],
    });
  }

  if (result.needsDelayReason) {
    const dl = result.needsDelayReason;
    const started = await tryStartEventFlow(ctx, "delay.reason.required", {
      stage: dl.stage,
      minutesLate: dl.minutesLate,
      scheduledAt: dl.scheduledAt,
      variant: "verify",
    });
    if (started) return { flow: "delay.reason" };
    await setPendingAction(ctx.conversationId, {
      type: "AWAITING_DELAY_REASON",
      stage: dl.stage,
    });
    return await reply({
      ...ctx,
      body: `The ${dl.stage.toLowerCase()} code is verified. This ${dl.stage.toLowerCase()} was about ${dl.minutesLate} min later than scheduled (${fmtWhen(dl.scheduledAt)}), so I need the reason before I can finish marking it. What caused the delay?`,
    });
  }

  return await reply({ ...ctx, body: verifiedDocumentReply(stage, result) });
}

function resolveDocumentStage(job, hintedStage, extraction = null) {
  const codes = (extraction?.codes ?? []).map(documentCode.normalizeCode);
  const pickupMatched = codes.includes(
    documentCode.normalizeCode(job.pickup_code),
  );
  const deliveryMatched = codes.includes(
    documentCode.normalizeCode(job.delivery_code),
  );

  if (pickupMatched && !deliveryMatched) return "PICKUP";
  if (deliveryMatched && !pickupMatched) return "DELIVERY";
  if (!job.pickup_verified_at) return "PICKUP";
  if (!job.delivery_verified_at) return "DELIVERY";
  return hintedStage ?? "DELIVERY";
}

module.exports = { handleInboundImage, handleStageDocument, resolveDocumentStage };
