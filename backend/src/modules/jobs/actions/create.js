const { defineAction } = require('../../../platform/registry');
const { ValidationError, ConflictError } = require('../../../platform/errors');
const { parseInstant } = require('../../../platform/time');
const { createSchema } = require('../schemas');
const { attachEvidence } = require('../../../platform/evidence');
const { generateJobNumber, generateSecurityCode } = require('../identifiers');
const { changed } = require('../load');
const changes = require('../changes');
const repo = require('../repo');
const { validateJobSchedule, validateCoordinate, normalizeUnit, validateDateInput } = require('../formRules');

const text = (value) => String(value ?? '').trim();

/** The new-job form's values, checked and with every default filled in. Throws the message the form shows. */
function normalize(input) {
  const pickupLocation = text(input.pickupLocation);
  const deliveryLocation = text(input.deliveryLocation);
  const cargo = text(input.cargo);
  if (!pickupLocation || !deliveryLocation || !cargo) throw new ValidationError('Pickup location, delivery location and cargo are required.');
  const quantity = Number.parseInt(String(input.quantity ?? ''), 10);
  const parsedPickup = parseInstant(input.pickupAt);
  const deliveryAt = parseInstant(input.deliveryAt);
  validateDateInput(input.pickupAt, parsedPickup, 'pickupAt');
  validateDateInput(input.deliveryAt, deliveryAt, 'deliveryAt');
  const pickupAt = parsedPickup ?? new Date(Date.now() + 24 * 3600 * 1000);
  validateJobSchedule(pickupAt, deliveryAt, { leadMs: 60 * 60 * 1000 });
  return {
    pickupLocation, deliveryLocation, cargo,
    status: input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
    jobNumber: text(input.jobNumber) || generateJobNumber(),
    pickupCode: text(input.pickupCode).slice(0, 40) || generateSecurityCode('PU'),
    deliveryCode: text(input.deliveryCode).slice(0, 40) || generateSecurityCode('DL'),
    pickupAt, deliveryAt,
    pickupCoordinates: validateCoordinate(input.pickupCoordinates, 'pickupLocation'),
    deliveryCoordinates: validateCoordinate(input.deliveryCoordinates, 'deliveryLocation'),
    quantity: Number.isNaN(quantity) || quantity < 0 ? null : quantity,
    unit: normalizeUnit(input.unit),
    instructions: text(input.instructions) || null,
  };
}

module.exports = defineAction({
  name: 'job.create',
  title: 'Create a job',
  description: 'Add a job with its pickup and delivery locations, cargo and schedule. It is published to drivers unless it is saved as a draft.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: createSchema,
  // The schedule is what policies judge, so it is known before the transaction does any work. Evidence collected before the job existed
  // is looked up under the evidenceRef.
  load: async ({ input }) => {
    const job = normalize(input);
    return { job, evidenceRef: input.evidenceRef, params: { pickupAt: job.pickupAt, deliveryAt: job.deliveryAt, evidenceRef: input.evidenceRef } };
  },
  handler: async ({ actor, tx, subject }) => {
    const { job: form, evidenceRef } = subject;
    const organizationId = actor.organizationId;
    const pickupId = await changes.findOrCreateLocation(tx, organizationId, form.pickupLocation, form.pickupCoordinates);
    const deliveryId = await changes.findOrCreateLocation(tx, organizationId, form.deliveryLocation, form.deliveryCoordinates);

    let job;
    try {
      job = await repo.insertJob(tx, {
        organizationId, jobNumber: form.jobNumber, currentStatus: form.status, cargoDescription: form.cargo, pickupAt: form.pickupAt,
        deliveryAt: form.deliveryAt, specialInstructions: form.instructions, publishedAt: form.status === 'PUBLISHED' ? new Date() : null,
        createdByUserId: actor.userId, pickupCode: form.pickupCode, deliveryCode: form.deliveryCode,
      });
    } catch (err) {
      if (err.code === 'P2002') throw new ConflictError(`Job number ${form.jobNumber} already exists.`);
      throw err;
    }

    if (form.quantity != null) await repo.insertItem(tx, { jobId: job.id, description: form.cargo, plannedQuantity: form.quantity, unit: form.unit });
    await repo.insertStops(tx, [
      { jobId: job.id, locationId: pickupId, stopSequence: 1, stopType: 'PICKUP', appointmentAt: form.pickupAt },
      { jobId: job.id, locationId: deliveryId, stopSequence: 2, stopType: 'DELIVERY', appointmentAt: form.deliveryAt },
    ]);

    if (evidenceRef) await attachEvidence(tx, { organizationId, evidenceRef, subjectType: 'JOB', subjectId: job.id });

    return {
      result: {
        id: job.id, jobNumber: job.jobNumber, status: job.currentStatus, cargo: form.cargo, pickup: form.pickupLocation, delivery: form.deliveryLocation,
        quantity: form.quantity != null ? `${form.quantity} ${form.unit}` : null, pickupAt: form.pickupAt, deliveryAt: form.deliveryAt,
        pickupCode: form.pickupCode, deliveryCode: form.deliveryCode, driver: null,
      },
      events: [changed(job, 'created'), ...(form.status === 'PUBLISHED' ? [{ type: 'job.published', payload: { jobId: job.id, jobNumber: job.jobNumber } }] : [])],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
