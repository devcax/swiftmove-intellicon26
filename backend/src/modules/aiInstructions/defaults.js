const { INSTRUCTIONS } = require('./catalog');
const { SYSTEM_PROMPT, VOICE_PROMPT, VISION_SYSTEM_PROMPT, EXTRACTION_PROMPT, CLASSIFY_PROMPT, TOPIC_ROUTER_PROMPT } = require('./prompts');
const { authorPrompt: FLOW_AUTHOR_PROMPT } = require('../flows');
const { authorPrompt: POLICY_AUTHOR_PROMPT } = require('../policies');

/** The prompt compiled into the code for each editable instruction. Runtime code falls back to these, so a bad edit cannot stop the bot. */
const DEFAULT_INSTRUCTION_CONTENT = {
  'interpreter.system': SYSTEM_PROMPT,
  'companion.voice': VOICE_PROMPT,
  'vision.classifier': VISION_SYSTEM_PROMPT,
  'document.extraction': EXTRACTION_PROMPT,
  'flow.classifier': CLASSIFY_PROMPT,
  'flow.author': FLOW_AUTHOR_PROMPT,
  'flow.topic_router': TOPIC_ROUTER_PROMPT,
  'policy.author': POLICY_AUTHOR_PROMPT,
};

module.exports = { INSTRUCTIONS, DEFAULT_INSTRUCTION_CONTENT };
