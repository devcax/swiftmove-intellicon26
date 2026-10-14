const { chatJson, AI_MODEL } = require("../../../platform/llm");
const { getInstruction } = require("../../../platform/instructions");
const { prompts: { SYSTEM_PROMPT } } = require("../../../modules/aiInstructions");
const { vocabulary: { INTENTS } } = require("../../../modules/flows");

const PROMPT_VERSION = "v1.7";

async function interpretMessage({
  text,
  driver,
  activeJob,
  activeJobSummary = null,
  pendingRequest,
  availableJobs,
  recentMessages,
  pendingAction,
}) {
  const context = {
    driver_name: driver.name,
    active_job: activeJob
      ? {
          job_number: activeJob.job_number,
          status: activeJob.status,
          pickup: activeJob.pickup,
          delivery: activeJob.delivery,
          cargo: activeJob.cargo,
          planned_quantity: activeJob.quantity,
        }
      : null,
    active_job_summary: activeJobSummary || null,
    pending_job_request: pendingRequest
      ? { job_number: pendingRequest.job_number }
      : null,
    available_jobs: (availableJobs ?? []).map((j) => ({
      job_number: j.job_number,
      route: `${j.pickup} -> ${j.delivery}`,
      cargo: j.cargo,
      quantity:
        j.quantity != null ? `${j.quantity} ${j.unit ?? ""}`.trim() : null,
      pickup_at: j.pickup_at,
    })),
    bot_is_waiting_for: pendingAction ? pendingAction.type : null,
    recent_conversation: (recentMessages ?? []).map(
      (m) => `${m.sender}: ${m.text}`,
    ),
  };

  const userPrompt = `CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nDRIVER MESSAGE:\n"""${text}"""\n\nThe message may combine consecutive chat bubbles into one sentence. Interpret the complete message together. A greeting followed by a request is not just a greeting. Do not invent missing details from incomplete words. Return the JSON event candidate now.`;

  const systemPrompt =
    (await getInstruction(driver?.organization_id, "interpreter.system")) ??
    SYSTEM_PROMPT;

  const result = await chatJson({
    system: systemPrompt,
    user: userPrompt,
    maxTokens: 700,
  });

  const intent = INTENTS.includes(result.intent) ? result.intent : "UNKNOWN";
  const events = Array.isArray(result.events)
    ? result.events.filter((e) => INTENTS.includes(e))
    : [];
  const confidence = Math.min(1, Math.max(0, Number(result.confidence) || 0));

  return {
    intent,
    events,
    job_reference:
      typeof result.job_reference === "string" ? result.job_reference : null,
    extracted_data:
      result.extracted_data && typeof result.extracted_data === "object"
        ? result.extracted_data
        : {},
    confidence,
    needs_confirmation: Boolean(result.needs_confirmation),
    clarification_question:
      typeof result.clarification_question === "string" &&
      result.clarification_question.trim() !== ""
        ? result.clarification_question.trim()
        : null,
  };
}

module.exports = { interpretMessage, PROMPT_VERSION, AI_MODEL };
