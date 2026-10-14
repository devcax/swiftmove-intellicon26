const { z } = require('zod');

const SUBJECT_TYPES = ['DRIVER', 'JOB', 'PENDING'];
const EVIDENCE_TYPES = ['DOCUMENT', 'CONFIRMATION', 'TEXT', 'LOCATION', 'APPROVAL'];

const NAME = /^[a-z][a-z0-9_]{1,59}$/;

/** What the `value` of each type may hold. DOCUMENT keeps its proof in attachmentId and APPROVAL's value is set by the server. */
const VALUE_SHAPES = {
  CONFIRMATION: z.object({ confirmed: z.literal(true) }).strict(),
  TEXT: z.object({ text: z.string().trim().min(1).max(500) }).strict(),
  LOCATION: z.object({
    lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracyM: z.number().min(0).max(100000).optional(),
  }).strict(),
  DOCUMENT: z.object({}).strict(),
  APPROVAL: z.object({}).strict(),
};

const recordSchema = z.object({
  subjectType: z.enum(SUBJECT_TYPES),
  // For PENDING this is the evidenceRef the client generated and will send again with the creating action.
  subjectId: z.guid(),
  name: z.string().regex(NAME, 'Use 2 to 60 lower-case letters, digits or underscores, starting with a letter.'),
  type: z.enum(EVIDENCE_TYPES),
  value: z.unknown().optional(),
  attachmentId: z.guid().optional(),
  expiresAt: z.iso.datetime().optional(),
}).strict().superRefine((input, ctx) => {
  const shape = VALUE_SHAPES[input.type];
  const parsed = shape.safeParse(input.value ?? {});
  if (!parsed.success) {
    for (const issue of parsed.error.issues) ctx.addIssue({ code: 'custom', path: ['value', ...issue.path], message: issue.message });
  }
  if (input.type === 'DOCUMENT' && !input.attachmentId) {
    ctx.addIssue({ code: 'custom', path: ['attachmentId'], message: 'A document needs an uploaded file.' });
  }
  if (input.type !== 'DOCUMENT' && input.attachmentId) {
    ctx.addIssue({ code: 'custom', path: ['attachmentId'], message: 'Only a document has a file.' });
  }
});

const revokeSchema = z.object({ id: z.guid() }).strict();
const purgeSchema = z.object({}).strict();

const listSchema = z.object({
  subjectType: z.enum(SUBJECT_TYPES),
  subjectId: z.guid(),
  name: z.string().regex(NAME).optional(),
  includeRevoked: z.enum(['true', 'false']).optional(),
}).strict();

/** The value stored for a record: the validated value, or for APPROVAL the manager who approved. */
function storedValue(input, actor) {
  if (input.type === 'APPROVAL') return { approvedByUserId: actor.userId };
  return VALUE_SHAPES[input.type].parse(input.value ?? {});
}

module.exports = { SUBJECT_TYPES, EVIDENCE_TYPES, NAME, recordSchema, revokeSchema, purgeSchema, listSchema, storedValue };
