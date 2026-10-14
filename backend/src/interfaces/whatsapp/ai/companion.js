const { logger } = require("../../../platform/logger");
const { chatCompletion } = require("../../../platform/llm");
const { getInstruction } = require("../../../platform/instructions");
const { prompts: { VOICE_PROMPT } } = require("../../../modules/aiInstructions");
const { firstName } = require("../../../platform/names");

const EMOJI_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{E0020}-\u{E007F}]/gu;

function sanitizeVoice(text) {
  return String(text ?? "")
    .replace(EMOJI_PATTERN, "")
    .replace(/[ \t]*[—–][ \t]*/g, ", ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.!?:;])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/,(\s*\n)/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/^[ \t]+/gm, "")
    .trim();
}

async function friendlyReply({
  situation,
  driverName,
  activeJob = null,
  activeJobSummary = null,
  availableJobs = [],
  driverMessage = null,
  recentMessages = [],
  organizationId = null,
}) {
  try {
    const voicePrompt =
      (await getInstruction(organizationId, "companion.voice")) ?? VOICE_PROMPT;
    const context = {
      driver_first_name: firstName(driverName),
      active_job: activeJob
        ? {
            job_number: activeJob.job_number,
            status: activeJob.status,
            pickup: activeJob.pickup,
            delivery: activeJob.delivery,
          }
        : null,
      trip_summary: activeJobSummary || null,
      open_jobs: availableJobs.map(
        (j) => `${j.job_number} (${j.pickup ?? "?"} → ${j.delivery ?? "?"})`,
      ),
      driver_message: driverMessage,
      recent_chat: recentMessages
        .slice(-4)
        .map((m) => `${m.sender}: ${m.text}`),
    };
    const text = await chatCompletion({
      messages: [
        { role: "system", content: voicePrompt },
        {
          role: "user",
          content: `SITUATION:\n${situation}\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}\n\nWrite the reply now.`,
        },
      ],
      temperature: 0.5,
      maxTokens: 140,
    });
    const cleaned = sanitizeVoice(
      String(text ?? "")
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .replace(/^["']|["']$/g, ""),
    );
    if (!cleaned || cleaned.length > 500) return null;
    return cleaned;
  } catch (err) {
    logger.warn({ err }, "friendlyReply unavailable, using static fallback");
    return null;
  }
}

module.exports = { friendlyReply, firstName, sanitizeVoice, VOICE_PROMPT };
