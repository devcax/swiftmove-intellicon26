const { z } = require('zod');

// The dashboard sends loosely shaped policy parts (a rule tree, match values, a block setting). They are checked by the policy
// DSL validator, which owns the vocabulary, so here they are only "something": the validator reports every problem with its path.
const loose = z.unknown().optional();
const id = z.guid();

const policyFields = {
  name: loose, description: loose, action: loose, enforcement: loose, match: loose, rule: loose, onBlock: loose, position: loose,
  sourceInstruction: z.string().max(4000).nullable().optional(),
};

const createSchema = z.object({ key: z.string().max(80).optional(), ...policyFields }).strict();

// A revision names what changed under `changes` (what the dashboard sends) or, as before, directly in the body.
const reviseSchema = z.object({ id, changes: z.record(z.string(), z.unknown()).optional(), ...policyFields }).strict();

const draftSchema = z.object({
  instruction: z.string().max(4000),
  base: z.object({ id: id.optional() }).passthrough().optional(),
}).strict();

const listAllSchema = z.object({ search: z.string().max(80).optional(), activeOnly: z.boolean().optional() }).strict();
const idSchema = z.object({ id }).strict();
const emptySchema = z.object({}).strict();

const testSchema = z.object({
  action: z.string().max(80).optional(), policyId: z.string().max(64).optional(), draft: z.record(z.string(), z.unknown()).optional(),
  sample: z.record(z.string(), z.unknown()).optional(), actor: z.string().max(20).optional(), source: z.string().max(20).optional(),
  // For a module action: run it through the runner as a dry run instead of a sample (task 6.1).
  input: z.record(z.string(), z.unknown()).optional(),
}).strict();

module.exports = { listAllSchema, createSchema, reviseSchema, draftSchema, idSchema, emptySchema, testSchema };
