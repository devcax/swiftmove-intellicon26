/**
 * The tools the assistant may use: every action and query the manager's roles allow, generated from the registry. The tool name is the
 * action name with the dot replaced; the description and input schema are the definition's own. There is no other way for the assistant
 * to reach data: no SQL, no HTTP, no code.
 */
const registry = require('../../platform/registry');

const toolName = (name) => name.replace('.', '_');
// Large lists made for the dashboard's builder screens (every version, every building block). The assistant gets the short `listAll`
// tools instead, so a list is never cut off halfway and a question about policies or conversations always finds the right tool.
const DASHBOARD_ONLY = new Set(['policy.list', 'flow.list']);
const roleAllowed = (definition, roles) => definition.roles.length === 0 || definition.roles.some((role) => roles.includes(role));

// The model has to be sent every tool it may use, on every round, and providers limit tokens per minute: leave out what it does not need.
function compact(node) {
  if (Array.isArray(node)) return node.map(compact);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'pattern' || key === 'additionalProperties' || key === '$schema') continue;
    out[key] = compact(value);
  }
  return out;
}

function schemaOf(name) {
  return compact(registry.toJsonSchema(name));
}

/** { tools: [OpenAI-style tool definitions], lookup: toolName -> { kind, definition } } for these roles. */
function buildTools(roles = []) {
  const lookup = new Map();
  const tools = [];
  const add = (kind, definition) => {
    const name = toolName(definition.name);
    if (lookup.has(name)) throw new Error(`Two tools would be called "${name}"`);
    lookup.set(name, { kind, definition });
    tools.push({
      type: 'function',
      function: {
        name,
        description: `${kind === 'action' ? 'CHANGES DATA. ' : 'Reads only. '}${definition.description}${definition.destructive ? ' Destructive: the manager must confirm it.' : ''}`.slice(0, 1000),
        parameters: schemaOf(definition.name),
      },
    });
  };
  for (const action of registry.listActions()) {
    if (action.target || !action.actors.includes('MANAGER') || !roleAllowed(action, roles)) continue;
    add('action', action);
  }
  for (const query of registry.listQueries()) {
    if (!query.actors.includes('MANAGER') || !roleAllowed(query, roles) || DASHBOARD_ONLY.has(query.name)) continue;
    add('query', query);
  }
  return { tools, lookup };
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'please', 'new', 'all', 'one', 'what', 'who', 'how', 'are', 'was', 'can', 'you', 'give', 'show', 'tell']);
const words = (text) => String(text ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/)
  .map((w) => (w.length > 4 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

// What managers say, and the words the tools use for it.
const ALIASES = { add: ['create'], register: ['create'], pause: ['disable'], stop: ['disable'], resume: ['enable'], remove: ['delete'], change: ['update'], edit: ['update'], rename: ['update'], late: ['delay'], delayed: ['delay'], accept: ['approve'], decline: ['reject'], close: ['complete', 'closure'], open: ['list'], list: ['list'], find: ['list', 'get'], who: ['list'], which: ['list'], status: ['status', 'get'], active: ['list'], live: ['list'], exist: ['list'], conversation: ['flow'], bot: ['flow'], rule: ['policy'] };

/**
 * The tools worth offering for this conversation: those whose name or description share words with what the manager wrote, best first.
 * Offering all of them costs thousands of tokens on every round. Anything the model asks for that was not offered is still looked up
 * in the full set, so nothing is lost by leaving a tool out; the manager can simply ask again with more words.
 */
function pickTools(tools, text, { limit = 14, minimum = 8 } = {}) {
  const wanted = new Set(words(text).flatMap((word) => [word, ...(ALIASES[word] ?? [])]));
  const scored = tools.map((tool) => {
    const nameWords = new Set(words(tool.function.name.replace('_', ' ')));
    const descriptionWords = new Set(words(tool.function.description));
    let score = 0;
    for (const word of wanted) {
      if (nameWords.has(word)) score += 3;
      else if (descriptionWords.has(word)) score += 1;
    }
    return { tool, score };
  });
  const picked = scored.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((entry) => entry.tool);
  // A short list of everything of a kind (policies, bot conversations) is always worth offering once that kind is mentioned.
  for (const tool of tools) {
    const [module, verb] = tool.function.name.split('_');
    if (verb === 'listAll' && wanted.has(module) && !picked.includes(tool)) picked.unshift(tool);
  }
  if (picked.length >= minimum) return picked;
  // Too little to go on: add the read tools, which cannot change anything, so the model can at least look things up.
  const reads = tools.filter((tool) => tool.function.description.startsWith('Reads only') && !picked.includes(tool));
  return [...picked, ...reads].slice(0, Math.max(minimum, picked.length));
}

module.exports = { buildTools, toolName, pickTools };
