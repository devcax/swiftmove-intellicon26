const { z } = require('zod');
const { CREATABLE_INTENTS } = require('./triggerCatalog');

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
const listAllSchema = z.object({ search: z.string().max(80).optional() }).strict();
// What the assistant sends to create a conversation: plain words and the thing a driver says to start it. The steps are written by the AI author.
const buildSchema = z.object({
  description: z.string().max(2000),
  starter: z.enum(CREATABLE_INTENTS),
  topic: z.string().max(40).optional(),
  name: z.string().max(120).optional(),
  key: z.string().max(61).optional(),
}).strict();
const simulateSchema = z.object({
  key, version: loose, inputs: loose, startData: z.record(z.string(), z.unknown()).optional(),
});

module.exports = { listAllSchema, buildSchema, createSchema, generateSchema, updateSchema, publishSchema, rollbackSchema, enabledSchema, keySchema, listSchema, simulateSchema };
