const { z } = require('zod');

const id = z.string().min(1).max(64);

const emptySchema = z.object({});
const idSchema = z.object({ id });
const sendSchema = z.object({ id, body: z.unknown().optional() });
const takeoverSchema = z.object({ id, enabled: z.unknown().optional() });

module.exports = { emptySchema, idSchema, sendSchema, takeoverSchema };
