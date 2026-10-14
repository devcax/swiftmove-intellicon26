const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const { ValidationError } = require('../../../platform/errors');
const { getPolicyParams } = require('../../../platform/policy/store');
const { filterJobsForDriver } = require('../vehicleMatch');
const repo = require('../repo');

const common = { actors: ['DRIVER', 'SYSTEM'], roles: [] };
const driverIdOf = (input, actor) => {
  const id = actor.type === 'DRIVER' ? actor.driverId : input.driverId;
  if (!id) throw new ValidationError('driverId is required.');
  return id;
};
const driverInput = z.object({ driverId: z.guid().optional() });
const availableInput = z.object({ driverId: z.guid().optional(), fitVehicle: z.boolean().optional() });

const available = defineQuery({
  ...common, name: 'request.available', input: availableInput,
  description: 'Open jobs a driver could ask for now: published, picked up inside the request window, not already requested by them or one they were released from. At most 10, soonest first. With fitVehicle, only the jobs their vehicle suits.',
  handler: async ({ input, actor, db }) => {
    const driverId = driverIdOf(input, actor);
    const window = await getPolicyParams(actor.organizationId, 'job.request-eligibility', 'pickup_within_hours', { hours: 24 });
    const hours = Number(window.hours) || 24;
    const jobs = await repo.listAvailableJobs(db, actor.organizationId, driverId, hours);
    if (!input.fitVehicle) return jobs;
    const driver = await repo.findDriverVehicle(db, driverId);
    return filterJobsForDriver({ id: driver.id, name: driver.name, vehicle_type: driver.vehicleType }, jobs);
  },
});

const pending = defineQuery({
  ...common, name: 'request.pending', input: driverInput, description: 'The driver\'s pending job request, newest first, or nothing.',
  handler: async ({ input, actor, db }) => {
    return repo.findPendingRequestOf(db, driverIdOf(input, actor));
  },
});

module.exports = { available, pending };
