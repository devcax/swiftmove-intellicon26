const { z } = require('zod');

/**
 * What a manager should be told about an event, written by the action that knows the details (driver name, reason, minutes late). It travels
 * in the event payload so the notifications plugin can show it without reading another module's tables. With the plugin off, nothing is shown
 * and nothing else changes.
 */
const notice = z.object({
  type: z.string().min(2).max(50), title: z.string().min(1).max(180), body: z.string().min(1).max(4000),
  severity: z.enum(['INFO', 'WARNING', 'HIGH', 'CRITICAL']).default('INFO'),
  incidentId: z.guid().nullish(),
});

module.exports = { notice };
