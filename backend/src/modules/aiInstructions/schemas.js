const { z } = require('zod');

// The text is checked by the action so the messages (too short, too long) stay the ones the dashboard shows.
const keySchema = z.object({ key: z.string().min(1).max(80) });
const updateSchema = z.object({ key: z.string().min(1).max(80), content: z.unknown().optional() });
const listSchema = z.object({});

module.exports = { keySchema, updateSchema, listSchema };
