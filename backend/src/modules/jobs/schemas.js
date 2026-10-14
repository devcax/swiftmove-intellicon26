const { z } = require('zod');

const id = z.string().min(1).max(64);
const text = z.union([z.string(), z.array(z.string())]).optional();

const listSchema = z.object({ status: text, search: text });
const emptySchema = z.object({});
const idSchema = z.object({ id });

// The new-job form sends loosely shaped values (dates as text, a quantity as text, extra fields such as a status). They are
// normalized and checked in the action, which owns the messages the form shows, so here they are only "something".
const loose = z.unknown().optional();
const createSchema = z.object({
  pickupLocation: loose, deliveryLocation: loose, cargo: loose, status: loose, jobNumber: loose, pickupCode: loose, deliveryCode: loose,
  pickupAt: loose, deliveryAt: loose, quantity: loose, unit: loose, instructions: loose, pickupCoordinates: loose, deliveryCoordinates: loose,
  // The id the form used for evidence it collected before the job existed (see the evidence module).
  evidenceRef: z.guid().optional(),
});
const updateSchema = z.object({
  id, pickupLocation: loose, deliveryLocation: loose, cargo: loose, pickupAt: loose, deliveryAt: loose, quantity: loose, unit: loose, instructions: loose, pickupCoordinates: loose, deliveryCoordinates: loose,
});
const cancelSchema = z.object({ id, reason: z.unknown().optional() });

module.exports = { listSchema, emptySchema, idSchema, createSchema, cancelSchema, updateSchema };
