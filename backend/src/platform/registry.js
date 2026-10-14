/**
 * One place where actions, queries, checks and events are declared.
 *
 * `defineX(definition)` validates a definition and returns it frozen. `registerModule(module)` adds a
 * module's definitions to the registry and rejects duplicates. `validateRegistry()` runs once all
 * modules are registered, because a check may name an action from a module registered later.
 * Anything wrong throws at startup, never at request time.
 *
 * Descriptions are read by non-technical people: the policy builder and the AI show them.
 */
const { z } = require('zod');

const DOTTED_NAME = /^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*$/;
const CHECK_NAME = /^[a-z][a-z0-9_]*$/;

class RegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RegistryError';
  }
}

const dottedName = z.string().regex(DOTTED_NAME, 'must look like "module.verb" (lower camel case)');
const actionRef = dottedName;
const description = z.string().trim().min(1, 'a description is required');
const zodSchema = z.custom((value) => value instanceof z.ZodType, 'an input zod schema is required');
const func = z.custom((value) => typeof value === 'function', 'must be a function');
const roles = z.array(z.enum(['ADMIN', 'MANAGER'])).default([]);

const actionShape = z.object({
  name: dottedName,
  title: z.string().trim().min(1),
  description,
  actors: z.array(z.enum(['DRIVER', 'MANAGER', 'SYSTEM'])).min(1),
  roles,
  destructive: z.boolean().default(false),
  matchFields: z.array(z.string().min(1)).default([]),
  // The policies of another action also apply to this one (a manager verifying a document is held to the rules written for the driver's photo).
  policyName: dottedName.optional(),
  input: zodSchema,
  // Slow work (an LLM call, a network read) that must not happen inside the transaction: runs before it opens.
  prepare: func.optional(),
  load: func.optional(),
  handler: func,
}).strict();

// A name settings attach to that is not something the system runs (the screening threshold for incoming messages). Policies may name it;
// nothing can run it.
const targetShape = z.object({
  name: dottedName,
  title: z.string().trim().min(1),
  description,
  actor: z.enum(['DRIVER', 'MANAGER', 'SYSTEM', 'ANY']),
  matchFields: z.array(z.string().min(1)).default([]),
}).strict();

// A query is for managers unless it says otherwise: the WhatsApp side reads a driver's own jobs through queries open to DRIVER.
const queryShape = z.object({
  name: dottedName, description, roles, actors: z.array(z.enum(['DRIVER', 'MANAGER', 'SYSTEM'])).min(1).default(['MANAGER']), input: zodSchema, handler: func,
}).strict();

const checkShape = z.object({
  name: z.string().regex(CHECK_NAME, 'must be snake_case'),
  label: z.string().trim().min(1),
  description,
  actions: z.union([z.literal('*'), z.array(actionRef).min(1)]),
  params: zodSchema,
  // Descriptors the policy validator and the AI author read until checks move to zod params.
  paramSpec: z.array(z.record(z.string(), z.unknown())).default([]),
  dataDependencies: z.array(z.string()).default([]),
  evidence: z.record(z.string(), z.unknown()).optional(),
  unavailableReason: z.string().optional(),
  available: z.boolean().default(true),
  requirement: func.optional(),
  // Text for a check that cannot be collected in a form (an approval, say): shown to the person as a notice.
  notice: func.optional(),
  evaluate: func,
}).strict();

const eventShape = z.object({ name: dottedName, description, payload: zodSchema }).strict();

function parseDefinition(shape, kind, raw) {
  const result = shape.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || 'definition'}: ${i.message}`).join('; ');
    throw new RegistryError(`Invalid ${kind} "${raw?.name ?? '?'}": ${issues}`);
  }
  return result.data;
}

function deepFreeze(definition) {
  for (const value of Object.values(definition)) if (Array.isArray(value)) Object.freeze(value);
  return Object.freeze(definition);
}

const defineAction = (raw) => deepFreeze(parseDefinition(actionShape, 'action', raw));
const defineTarget = (raw) => deepFreeze({ ...parseDefinition(targetShape, 'policy target', raw), target: true });
const defineQuery = (raw) => deepFreeze(parseDefinition(queryShape, 'query', raw));
const defineCheck = (raw) => deepFreeze(parseDefinition(checkShape, 'check', raw));
const defineEvent = (raw) => deepFreeze(parseDefinition(eventShape, 'event', raw));

/** A separate registry per call keeps tests isolated; the app uses the shared one below. */
function createRegistry() {
  const stores = { action: new Map(), query: new Map(), check: new Map(), event: new Map() };
  const modules = new Set();

  function add(kind, definition) {
    if (kind === 'query' || kind === 'action') {
      const other = kind === 'query' ? 'action' : 'query';
      if (stores[other].has(definition.name)) throw new RegistryError(`"${definition.name}" is already used by an ${other}`);
    }
    if (stores[kind].has(definition.name)) throw new RegistryError(`Duplicate ${kind} "${definition.name}"`);
    stores[kind].set(definition.name, definition);
  }

  function registerModule(mod) {
    if (!mod?.name) throw new RegistryError('A module needs a name');
    if (modules.has(mod.name)) throw new RegistryError(`Duplicate module "${mod.name}"`);
    modules.add(mod.name);
    for (const action of mod.actions ?? []) add('action', action);
    for (const query of mod.queries ?? []) add('query', query);
    for (const check of mod.checks ?? []) add('check', check);
    for (const event of mod.events ?? []) add('event', event);
  }

  function validateRegistry() {
    for (const check of stores.check.values()) {
      if (check.actions === '*') continue;
      for (const actionName of check.actions) {
        if (!stores.action.has(actionName)) {
          throw new RegistryError(`Check "${check.name}" lists unknown action "${actionName}"`);
        }
      }
    }
  }

  const lookup = (kind) => (name) => stores[kind].get(name);
  const list = (kind) => () => [...stores[kind].values()];

  function toJsonSchema(name) {
    const definition = stores.action.get(name) ?? stores.query.get(name);
    if (!definition) throw new RegistryError(`Unknown action or query "${name}"`);
    // The input side, as a caller must send it. A transform (a phone number cleaned up) has no JSON form, so that field is left open.
    return z.toJSONSchema(definition.input, { io: 'input', unrepresentable: 'any' });
  }

  return {
    registerModule, validateRegistry, toJsonSchema,
    getAction: lookup('action'), listActions: list('action'),
    getQuery: lookup('query'), listQueries: list('query'),
    getCheck: lookup('check'), listChecks: list('check'),
    getEvent: lookup('event'), listEvents: list('event'),
  };
}

const registry = createRegistry();

module.exports = {
  RegistryError, createRegistry, defineAction, defineTarget, defineQuery, defineCheck, defineEvent,
  registerModule: registry.registerModule, validateRegistry: registry.validateRegistry, toJsonSchema: registry.toJsonSchema,
  getAction: registry.getAction, listActions: registry.listActions,
  getQuery: registry.getQuery, listQueries: registry.listQueries,
  getCheck: registry.getCheck, listChecks: registry.listChecks,
  listEvents: registry.listEvents, getEvent: registry.getEvent,
};
