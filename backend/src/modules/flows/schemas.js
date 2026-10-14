const { z } = require('zod');

// The dashboard sends loosely shaped flow parts (a definition tree, a trigger). They are checked by the flow validator and the
// trigger rules, which own the vocabulary and the messages, so here they are only "something".
const loose = z.unknown().optional();
const key = z.string().min(1).max(80);

const createSchema = z.object({ key: loose, name: loose, description: loose, triggerType: loose, triggerConfig: loose, definition: loose });
const generateSchema = z.object({ description: loose, base: loose });
const updateSchema = z.object({ key, name: loose, description: loose, triggerConfig: loose, definition: loose });
const publishSchema = z.object({ key, version: loose });
const rollbackSchema = z.object({ key, version: loose });
const enabledSchema = z.object({ key, enabled: loose });
const keySchema = z.object({ key });
const listSchema = z.object({});
const simulateSchema = z.object({
  key, version: loose, inputs: loose, startData: z.record(z.string(), z.unknown()).optional(),
});

module.exports = { createSchema, generateSchema, updateSchema, publishSchema, rollbackSchema, enabledSchema, keySchema, listSchema, simulateSchema };
