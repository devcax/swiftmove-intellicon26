/** Which job statuses the dashboard numbers group together. Derived from the trip module's list of live statuses. */
const { LIVE_STATUSES } = require('../../platform/jobStateMachine');

// Finished on the road but not yet closed: delivered, or in the closure review loop.
const AWAITING_COMPLETION = ['DELIVERED', 'DELIVERED_WITH_EXCEPTION', 'DRIVER_SUBMITTED_COMPLETION', 'MANAGER_REVIEW', 'REQUIRES_CORRECTION'];
// On the road: live, and not waiting to be closed or in cancellation review.
const ON_THE_ROAD = LIVE_STATUSES.filter((status) => !AWAITING_COMPLETION.includes(status) && status !== 'CANCELLATION_REVIEW');

// What the "last update" column says for a job with no event yet.
const STATUS_TEXT = {
  MANAGER_APPROVED: 'Approved, assignment being sent',
  ASSIGNMENT_SENT: 'Assignment sent to driver',
  ASSIGNED: 'Driver assigned',
  IN_PROGRESS: 'On the way',
  ARRIVED_AT_PICKUP: 'Arrived at pickup',
  LOADING_STARTED: 'Loading started',
  LOADED: 'Loaded, departing',
  DEPARTED: 'En route to delivery',
  ARRIVED_AT_DELIVERY: 'Arrived at delivery',
  UNLOADING_STARTED: 'Unloading started',
  UNLOADED: 'Unloaded',
  DELAYED: 'Running behind schedule',
  INCIDENT_OPEN: 'Incident reported',
};

module.exports = { LIVE_STATUSES, AWAITING_COMPLETION, ON_THE_ROAD, STATUS_TEXT };
