const { NotFoundError } = require('../../platform/errors');
const { invalidateInstructions } = require('../../platform/instructions');
const { INSTRUCTIONS } = require('./defaults');

/** The instruction's metadata, or a 404 for a key the code does not know. */
function requireKnown(key) {
  if (!INSTRUCTIONS[key]) throw new NotFoundError(`Unknown instruction "${key}".`);
  return INSTRUCTIONS[key];
}

/** The bot caches the text it reads; drop that cache once the change is committed. */
const dropCache = (organizationId) => () => invalidateInstructions(organizationId);

const changed = (id, key, change) => ({ type: 'aiInstruction.changed', payload: { instructionId: id, key, change } });

module.exports = { requireKnown, dropCache, changed };
