/**
 * AI flow author — turns a manager's plain-words description into a flow
 * definition draft.
 *
 * The LLM is only an authoring assistant: its output is validated with the
 * exact same validateFlow() rules the editor and publish paths use, and one
 * automatic retry feeds the validator's complaints back to the model. What
 * comes back still lands in the dashboard as a draft — a manager reviews it
 * in the graph/simulator and publishes through the normal endpoints, so the
 * runtime stays deterministic.
 *
 * The prompt is an AI instruction (flow.author) so it can be tuned from the
 * dashboard like the other prompts.
 */
const { chatJson } = require('../../platform/llm');
const { getInstruction } = require('../../platform/instructions');

const AUTHOR_PROMPT = `You design conversation flows for a WhatsApp logistics bot used by truck drivers.
A manager describes a conversation in plain words and you turn it into a flow definition (JSON).

A flow definition is {"steps": [...]} — a small DAG of typed steps. The FIRST step in the array is where the conversation starts. Branch only with the shapes below; never invent step types or fields.

Step types:
- SAY {"id","type":"SAY","text","next"} — send a message and move on. next is required.
- ASK_CHOICE {"id","type":"ASK_CHOICE","text","options":[{"id","label","next"}],"saveAs"?} — ask with tappable options. 1-10 options; labels max 24 characters; at most 3 options render as buttons, more as a list. saveAs stores the chosen label. option ids must be unique UPPER_SNAKE strings.
- ASK_TEXT {"id","type":"ASK_TEXT","text","saveAs","next"?} — ask and capture free text into saveAs. Exactly one routing: "next", or "onText", or "classify" (below).
- ASK_LOCATION {"id","type":"ASK_LOCATION","text","next"} — ask the driver to share WhatsApp location. next required.
- ASK_PHOTO {"id","type":"ASK_PHOTO","text","next"} — ask for a photo. next required.
- ACTION {"id","type":"ACTION","name","params"?,"next"?} — run a whitelisted system action, then continue to next; omit next to finish. Only use actions from the provided list, and only when the manager's description matches what the action does. Simple question-answer or FAQ flows need NO action at all.
- IF {"id","type":"IF","check","then","else"} — fork on a fact known at the start: check is "driver_gave_job_number" or "driver_gave_reason"; then/else are step ids. Sends nothing. Use it only when the description clearly says the conversation differs by that fact.
- END {"id","type":"END","text"?} — finish, optionally with a final message.

Routing free-text answers (ASK_TEXT only, pick ONE):
- "next": every answer goes to one step.
- "onText": {"intentMap":{"INTENT_NAME":"stepId"},"elseNext":"stepId"} — route on the AI-read intent of the answer (intent names UPPER_SNAKE, e.g. CONFIRM_EVENT means yes, CORRECT_EVENT means the driver corrects something).
- "classify": {"categories":[{"id":"UPPER_SNAKE","description":"what the answer sounds like","next":"stepId"}],"fallback":"stepId"} — the AI places the answer into one of your categories (max 10). fallback is required.

Extras you may add to ASK_* steps: "reprompt" (text re-sent when the answer doesn't fit), "cancelPattern" (regex string like "^(cancel|never mind)$" letting the driver bail out), "cancelText" (sent when they bail).

Templates: message texts may reference captured values with {saveAsName}, {saveAsName|lower}, {saveAsName|upper}. ACTION params map keys to template strings or "$saveAsName" for the raw value.

Hard rules (a validator rejects anything else):
- step ids: short lowercase slugs (a-z 0-9 _ -), unique.
- every next/branch target must be an existing step id; no unreachable steps; NO cycles (a flow can never loop back — re-asking is done with reprompt, not loops).
- texts are never empty, max 2000 chars, balanced {} braces.
- keep it small: usually 2-8 steps. Friendly, short WhatsApp-style English for texts.

Respond with JSON only: {"name":"short flow name","description":"one sentence for managers","definition":{"steps":[...]}}.`;

/** One LLM attempt; separated so the retry can append validator feedback. */
function buildUserMessage({ description, base, catalogs, issues }) {
  const parts = [];
  parts.push(`Whitelisted actions (name — what it does):\n${catalogs.actions}`);
  parts.push(`Dynamic prompt providers (name — what it shows):\n${catalogs.promptProviders}`);
  if (base) {
    parts.push(`Current flow definition to modify:\n${JSON.stringify(base)}`);
    parts.push(`The manager wants this change: """${description}"""\nReturn the complete updated flow.`);
  } else {
    parts.push(`The manager wants a NEW flow: """${description}"""`);
  }
  if (issues?.length) {
    parts.push(
      `Your previous draft was rejected by the validator. Fix exactly these problems and return the corrected flow:\n- ${issues.join('\n- ')}`
    );
  }
  return parts.join('\n\n');
}

function formatIssues(errors) {
  return errors.map((e) => `${e.step ? `${e.step}: ` : ''}${e.message}`);
}

/**
 * Draft a flow definition from a plain-words description.
 *
 * @param {object} args
 * @param {string} args.description  What the manager wants (or the change, when base is given).
 * @param {object} [args.base]       Existing definition to modify (edit-with-AI).
 * @param {string|null} [args.organizationId]  For the flow.author instruction override.
 * @param {object} args.catalogs     { actions, promptProviders } — pre-rendered bullet lists.
 * @param {Function} args.validate   validateFlow-compatible fn returning { ok, errors }.
 * @param {Function} [args.chat]     chatJson-compatible fn (injectable for tests).
 * @param {Function} [args.resolveInstruction]  getInstruction-compatible fn (injectable for tests).
 * @returns {Promise<{ ok: boolean, name?: string, description?: string,
 *                     definition?: object, issues?: string[], attempts: number }>}
 */
async function draftFlow({ description, base = null, organizationId = null, catalogs, validate, chat = chatJson, resolveInstruction = getInstruction }) {
  const system = (await resolveInstruction(organizationId, 'flow.author')) ?? AUTHOR_PROMPT;

  let issues = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const user = buildUserMessage({ description, base, catalogs, issues });
    const result = await chat({
      system,
      user,
      maxTokens: 4000,
      temperature: attempt === 1 ? 0.2 : 0,
    });

    const definition = result?.definition;
    const check = validate(definition);
    if (check.ok) {
      return {
        ok: true,
        name: String(result?.name ?? '').trim().slice(0, 120) || null,
        description: String(result?.description ?? '').trim().slice(0, 500) || null,
        definition,
        attempts: attempt,
      };
    }
    issues = formatIssues(check.errors);
  }

  return { ok: false, issues, attempts: 2 };
}

module.exports = { AUTHOR_PROMPT, draftFlow };
