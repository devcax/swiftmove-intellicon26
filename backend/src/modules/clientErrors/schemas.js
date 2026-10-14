const { z } = require('zod');

const MAX_CHARS = 2000;

// Anything a browser sends is untrusted text: cap it and drop control characters before it reaches a log.
const text = z.string().max(MAX_CHARS).transform((value) => value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim());

const clientErrorSchema = z.object({
  message: text,
  path: text.optional(),
  digest: text.optional(),
}).strict();

module.exports = { clientErrorSchema, MAX_CHARS };
