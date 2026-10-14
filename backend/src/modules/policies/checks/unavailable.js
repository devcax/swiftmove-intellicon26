const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

// Declared but not supported yet: listed so the policy builder and the AI author can say so honestly instead of pretending they work.
const unavailable = ({ name, label, description, reason, message }) => defineCheck({
  name, label, description, actions: '*', params: z.object({}), available: false, unavailableReason: reason,
  evaluate: async () => ({ pass: false, code: 'UNSUPPORTED', message }),
});

module.exports = [
  unavailable({
    name: 'location_within_radius', label: 'Driver is within a location radius', description: 'The driver’s shared location is within a given radius of a job stop.',
    reason: 'Locations have no GPS coordinates and no geofence evaluator exists yet. Add coordinates to locations and a distance check first.',
    message: 'Location checks are not supported yet.',
  }),
  unavailable({
    name: 'signature_exists', label: 'A signature was captured', description: 'A customer signature is on file for the delivery.',
    reason: 'There is no signature capture in the current document pipeline.', message: 'Signature capture is not supported yet.',
  }),
  unavailable({
    name: 'payment_received', label: 'Payment was received', description: 'A payment is recorded for the job.',
    reason: 'There is no payment integration in the current system.', message: 'Payment checks are not supported yet.',
  }),
];
