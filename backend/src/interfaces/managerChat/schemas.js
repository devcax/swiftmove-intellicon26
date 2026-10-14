const { z } = require('zod');

const settingsBody = z.object({
  contextMessages: z.number().int().min(2, 'Use at least 2.').max(30, 'Use at most 30.').optional(),
  title: z.string().trim().min(1, 'Enter a chat name.').max(60, 'Use at most 60 characters.').optional(),
}).strict().refine(value => value.contextMessages !== undefined || value.title !== undefined, { message: 'Provide a chat name or context limit.' });

module.exports = { settingsBody };
