const { logger } = require("../../../platform/logger");
const whatsapp = require("../../../platform/whatsappClient");
const { chatVision, AI_VISION_MODEL } = require("../../../platform/llm");
const { getInstruction } = require("../../../platform/instructions");
const { prompts: { EXTRACTION_PROMPT } } = require("../../../modules/aiInstructions");
const { documentCodes: { OUTCOME, normalizeCode, matchesExpectedCode } } = require("../../../modules/trip");
const repo = require("../repo");

async function extractDocumentCodes(attachmentId, caption = null) {
  const fail = (error) => ({
    outcome: OUTCOME.TECH_FAIL,
    codes: [],
    jobNumber: null,
    notes: null,
    error,
  });

  if (!AI_VISION_MODEL) {
    return fail("No vision model is configured (AI_VISION_MODEL is empty).");
  }

  let att;
  try {
    att = await repo.findAttachmentForVision(attachmentId);
  } catch (err) {
    return fail(`Attachment lookup failed: ${err.message}`);
  }
  if (!att) return fail("Attachment not found.");

  if (att.vision?.code_extraction) {
    return att.vision.code_extraction;
  }

  let imageBase64;
  let mimeType = att.mimeType ?? "image/jpeg";
  try {
    const { buffer, mimeType: dlMime } = await whatsapp.downloadMedia(
      att.storageKey,
    );
    imageBase64 = buffer.toString("base64");
    if (dlMime) mimeType = dlMime;
  } catch (err) {
    return fail(`Media download failed: ${err.message}`);
  }

  let raw;
  try {
    const systemPrompt =
      (await getInstruction(null, "document.extraction")) ?? EXTRACTION_PROMPT;
    raw = await chatVision({
      system: systemPrompt,
      imageBase64,
      mimeType,
      caption,
      throwOnError: true,
    });
  } catch (err) {
    return fail(`Vision call failed: ${err.message}`);
  }
  if (!raw || typeof raw !== "object") {
    return fail("The document reader returned no usable result.");
  }

  const codes = Array.isArray(raw.detected_codes)
    ? raw.detected_codes
        .map((c) => String(c).trim().toUpperCase())
        .filter(Boolean)
    : [];
  const jobNumber = raw.detected_job_number
    ? String(raw.detected_job_number).trim().toUpperCase()
    : null;
  const notes =
    typeof raw.notes === "string" && raw.notes.trim()
      ? raw.notes.trim().slice(0, 200)
      : null;

  const readable = raw.readable !== false;
  const result =
    readable && codes.length > 0
      ? { outcome: OUTCOME.OK, codes, jobNumber, notes, error: null }
      : { outcome: OUTCOME.UNCLEAR, codes, jobNumber, notes, error: null };

  try {
    await repo.saveCodeExtraction(attachmentId, result);
  } catch (err) {
    logger.error({ err }, `Could not cache code extraction for attachment ${attachmentId}`);
  }

  return result;
}

module.exports = {
  OUTCOME,
  EXTRACTION_PROMPT,
  extractDocumentCodes,
  matchesExpectedCode,
  normalizeCode,
};
