const { logger } = require('../../../platform/logger');
const whatsapp = require('../../../platform/whatsappClient');
const { chatVision, AI_VISION_MODEL } = require('../../../platform/llm');
const { getInstruction } = require('../../../platform/instructions');
const { prompts: { VISION_SYSTEM_PROMPT } } = require('../../../modules/aiInstructions');
const repo = require('../repo');

const SCENE_CLASSES = ['ACCIDENT', 'BREAKDOWN', 'DAMAGE', 'CARGO', 'PICKUP_PAPER', 'DELIVERY_PAPER', 'POD', 'OTHER'];

function visionAvailable() {
  return Boolean(AI_VISION_MODEL);
}

async function analyzeAttachment(attachmentId, caption = null) {
  if (!visionAvailable()) return null;

  const att = await repo.findAttachmentForVision(attachmentId);
  if (!att) return null;
  if (att.vision?.scene_class) return att.vision;

  let imageBase64;
  let mimeType = att.mimeType ?? 'image/jpeg';
  try {
    const { buffer, mimeType: dlMime } = await whatsapp.downloadMedia(att.storageKey);
    imageBase64 = buffer.toString('base64');
    if (dlMime) mimeType = dlMime;
  } catch (err) {
    logger.error({ err }, `Vision download failed for attachment ${attachmentId}`);
    return null;
  }

  const systemPrompt = (await getInstruction(null, 'vision.classifier')) ?? VISION_SYSTEM_PROMPT;
  const result = await chatVision({ system: systemPrompt, imageBase64, mimeType, caption });
  if (!result || !SCENE_CLASSES.includes(result.scene_class)) return null;

  const normalized = {
    scene_class: result.scene_class,
    description: String(result.description ?? '').slice(0, 500),
    detected_job_number: result.detected_job_number ? String(result.detected_job_number).trim().toUpperCase() : null,
    detected_codes: Array.isArray(result.detected_codes)
      ? result.detected_codes.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
      : [],
    severity_hint: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(result.severity_hint) ? result.severity_hint : null,
  };
  await repo.saveVision(attachmentId, normalized);
  return normalized;
}

module.exports = { visionAvailable, analyzeAttachment, SCENE_CLASSES, VISION_SYSTEM_PROMPT };
