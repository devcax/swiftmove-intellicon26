const { z } = require('zod');

const id = z.string().min(1).max(64);
const csv = z.union([z.string(), z.array(z.string())]).optional();

const listSchema = z.object({ status: csv, severity: csv });
const idSchema = z.object({ id });
const notesSchema = z.object({ id, managerNotes: z.unknown().optional() });
const reviewSchema = z.object({ id, managerNotes: z.unknown().optional() });

// What the chat extracted from a driver message or photo. The type and severity are normalized by the action (an unknown type is
// OTHER), so they are only "something" here.
const reportSchema = z.object({
  incidentType: z.unknown().optional(), severity: z.unknown().optional(), description: z.string().min(1).max(20000),
  data: z.record(z.string(), z.unknown()).optional(), messageId: z.guid().nullish(), confidence: z.number().nullish(),
  eventType: z.enum(['INCIDENT_REPORTED', 'FAILED_DELIVERY']).optional(), imageUrl: z.string().max(2000).nullish(), attachmentId: z.guid().nullish(),
});
const followupSchema = z.object({
  incidentId: z.guid(), lat: z.number().min(-90).max(90).nullish(), lng: z.number().min(-180).max(180).nullish(),
  backupVehicle: z.enum(['REQUESTED', 'DECLINED']).nullish(), complete: z.boolean().optional(),
});

module.exports = { listSchema, idSchema, notesSchema, reviewSchema, reportSchema, followupSchema };
