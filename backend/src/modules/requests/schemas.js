const { z } = require('zod');

const id = z.string().min(1).max(64);
const messageId = z.guid().nullish();
const confidence = z.number().nullish();

const listSchema = z.object({ status: z.union([z.string(), z.array(z.string())]).optional() });
const emptySchema = z.object({});
const idSchema = z.object({ id });
const rejectSchema = z.object({ id, reason: z.unknown().optional() });
const submitSchema = z.object({ jobId: z.guid(), messageId, confidence });
const driverStepSchema = z.object({ messageId, confidence });
const sendOfferSchema = z.object({ jobId: z.guid(), driverId: z.guid(), matchFit: z.string().max(40).nullish(), matchReason: z.string().max(500).nullish() });

module.exports = { listSchema, emptySchema, idSchema, rejectSchema, submitSchema, driverStepSchema, sendOfferSchema };
