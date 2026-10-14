/** The values the built-in policies are seeded with. Managers change them afterwards as policies; these are only the starting point. */
const config = require('../../platform/config');

const DEFAULTS = {
  documentGates: { LOADED: 'PICKUP', DELIVERED: 'DELIVERY' },
  pickupBeforeDeliveryDoc: true,
  requireStartConfirmation: true,
  protectedMilestones: ['ASSIGNED', 'IN_PROGRESS', 'LOADED', 'DELIVERED', 'COMPLETED'],
  frozenStatuses: ['COMPLETED', 'CANCELLED'],
  promptThreshold: config.aiGuardThreshold,
  autoClosureMinutes: config.autoClosureDelayMinutes,
  jobRequestWindowHours: config.jobRequestWindowHours,
};

module.exports = { GUARD_DEFAULTS: DEFAULTS };
