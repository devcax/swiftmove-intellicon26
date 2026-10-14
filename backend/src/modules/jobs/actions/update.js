const { defineAction } = require('../../../platform/registry');
const { ValidationError, ConflictError } = require('../../../platform/errors');
const { parseInstant } = require('../../../platform/time');
const { updateSchema } = require('../schemas');
const { lockJob, changed } = require('../load');
const { toJobSummary } = require('../present');
const changes = require('../changes');
const repo = require('../repo');
const { validateJobSchedule, validateCoordinate, normalizeUnit, validateDateInput } = require('../formRules');

const text = (value) => String(value ?? '').trim();

module.exports = defineAction({
  name: 'job.update',
  title: 'Edit a job',
  description: 'Change the cargo, locations, schedule, quantity or instructions of a job that is still a draft or published.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: updateSchema,
  load: async (args) => {
    const subject = await lockJob(args); // a missing job is a 404 before the form is judged, as before
    const { input } = args;
    const form = { pickupLocation: text(input.pickupLocation), deliveryLocation: text(input.deliveryLocation), cargo: text(input.cargo) };
    if (!form.pickupLocation || !form.deliveryLocation || !form.cargo) throw new ValidationError('Pickup location, delivery location and cargo are required.');
    const quantity = Number.parseInt(String(input.quantity ?? ''), 10);
    Object.assign(form, {
      pickupAt: parseInstant(input.pickupAt), deliveryAt: parseInstant(input.deliveryAt), quantity: Number.isNaN(quantity) || quantity < 0 ? null : quantity,
      unit: normalizeUnit(input.unit), instructions: text(input.instructions) || null,
      pickupCoordinates: validateCoordinate(input.pickupCoordinates, 'pickupLocation'),
      deliveryCoordinates: validateCoordinate(input.deliveryCoordinates, 'deliveryLocation'),
    });
    validateDateInput(input.pickupAt, form.pickupAt, 'pickupAt');
    validateDateInput(input.deliveryAt, form.deliveryAt, 'deliveryAt');
    return { ...subject, form };
  },
  handler: async ({ input, actor, tx, subject }) => {
    const { form } = subject;
    const organizationId = actor.organizationId;
    const job = await changes.findJob(tx, organizationId, input.id);
    if (!['DRAFT', 'PUBLISHED'].includes(job.currentStatus)) throw new ConflictError('Only draft or published jobs can be edited.');
    validateJobSchedule(form.pickupAt ?? job.pickupAt, form.deliveryAt, { graceMs: 60 * 1000 });

    const pickupId = await changes.findOrCreateLocation(tx, organizationId, form.pickupLocation, form.pickupCoordinates);
    const deliveryId = await changes.findOrCreateLocation(tx, organizationId, form.deliveryLocation, form.deliveryCoordinates);
    await repo.updateJobFields(tx, job.id, { cargoDescription: form.cargo, pickupAt: form.pickupAt ?? undefined, deliveryAt: form.deliveryAt, specialInstructions: form.instructions });
    await repo.updateStop(tx, job.id, 'PICKUP', { locationId: pickupId, appointmentAt: form.pickupAt ?? undefined });
    await repo.updateStop(tx, job.id, 'DELIVERY', { locationId: deliveryId, appointmentAt: form.deliveryAt });
    if (form.quantity != null) await repo.saveFirstItem(tx, job.id, { description: form.cargo, plannedQuantity: form.quantity, unit: form.unit });
    return { result: toJobSummary(await repo.findJobSummary(tx, organizationId, job.id)), events: [changed(job, 'edited')], subject: { type: 'JOB', id: job.id } };
  },
});
