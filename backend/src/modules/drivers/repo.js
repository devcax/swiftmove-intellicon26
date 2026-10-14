/**
 * Every Prisma call for drivers. Each function takes the client first, so it works with the global
 * client (queries) and with a transaction (actions). Every call filters by organization.
 */
const { Prisma } = require('@prisma/client');
const { ConflictError } = require('../../platform/errors');

const DUPLICATE = 'A driver with this phone number or license plate is already registered.';

/** Turn a unique-constraint violation (phone number or license plate) into the error the dashboard expects. */
async function orConflict(work) {
  try {
    return await work();
  } catch (err) {
    if (err.code === 'P2002') throw new ConflictError(DUPLICATE);
    throw err;
  }
}

// completedTrips counts assignment rows whose job is COMPLETED, through a filtered relation count.
const LIST_SELECT = {
  id: true, name: true, status: true, vehicleType: true, licensePlate: true,
  activeJob: { select: { jobNumber: true } },
  driverWhatsappAccounts: { where: { isPrimary: true }, select: { phoneE164: true, verificationStatus: true }, take: 1 },
  _count: { select: { jobAssignments: { where: { job: { currentStatus: 'COMPLETED' } } } } },
};

function flatten(row) {
  const account = row.driverWhatsappAccounts[0];
  return {
    id: row.id, name: row.name, status: row.status, vehicleType: row.vehicleType, licensePlate: row.licensePlate,
    phone: account?.phoneE164, verificationStatus: account?.verificationStatus,
    currentJob: row.activeJob?.jobNumber, completedTrips: row._count.jobAssignments,
  };
}

async function listDrivers(client, organizationId) {
  const rows = await client.driver.findMany({
    where: { organizationId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: LIST_SELECT, take: 1000,
  });
  return rows.map(flatten);
}

async function findDriver(client, organizationId, id) {
  const row = await client.driver.findFirst({ where: { id, organizationId }, select: LIST_SELECT });
  return row ? flatten(row) : null;
}

/** A new driver is ACTIVE and their number is verified: a manager typed it in. */
const insertDriver = (tx, organizationId, { name, phone, vehicleType, licensePlate }) => orConflict(() => tx.driver.create({
  data: {
    organizationId, name, status: 'ACTIVE', vehicleType, licensePlate,
    driverWhatsappAccounts: { create: { phoneE164: phone, isPrimary: true, verificationStatus: 'VERIFIED' } },
  },
  select: { id: true },
}));

const updateFields = (tx, organizationId, id, { name, status, vehicleType, licensePlate }) => orConflict(() => tx.driver.updateMany({
  where: { id, organizationId }, data: { name, status, vehicleType, licensePlate },
}));

const setStatus = (tx, organizationId, id, status) => tx.driver.updateMany({ where: { id, organizationId }, data: { status } });

/** Change the primary number. A different number has to be verified again; the same one keeps its status. */
async function replacePrimaryPhone(tx, driverId, phone) {
  const previous = await tx.driverWhatsappAccount.findFirst({ where: { driverId, isPrimary: true } });
  if (!previous) {
    await orConflict(() => tx.driverWhatsappAccount.create({
      data: { driverId, phoneE164: phone, isPrimary: true, verificationStatus: 'UNVERIFIED' },
    }));
    return;
  }
  const verificationStatus = previous.phoneE164 === phone ? previous.verificationStatus : 'UNVERIFIED';
  await orConflict(() => tx.driverWhatsappAccount.update({ where: { id: previous.id }, data: { phoneE164: phone, verificationStatus } }));
}

/**
 * Delete a driver and everything that points at them. Messages and their attachments, interpretations
 * and confirmations go with the driver's conversations; rows other parts of the system keep (incidents
 * reported by the driver go, but notifications, audit entries and summaries only lose the link).
 * Order matters: rows are cleared before the rows they reference.
 */
async function deleteDriverCascade(tx, organizationId, driverId) {
  const inDriverMessages = { conversation: { driverId } };
  await tx.eventConfirmation.deleteMany({
    where: { OR: [{ confirmationMessage: inDriverMessages }, { workflowEvent: { sourceMessage: inDriverMessages } }] },
  });
  await tx.workflowEvent.updateMany({ where: { sourceMessage: inDriverMessages }, data: { sourceMessageId: null } });
  await tx.incident.updateMany({ where: { sourceMessage: inDriverMessages }, data: { sourceMessageId: null } });
  await tx.aiInterpretation.deleteMany({ where: { message: inDriverMessages } });

  const driverAttachments = { message: inDriverMessages };
  await tx.job.updateMany({ where: { pickupProofAttachment: driverAttachments }, data: { pickupProofAttachmentId: null } });
  await tx.job.updateMany({ where: { deliveryProofAttachment: driverAttachments }, data: { deliveryProofAttachmentId: null } });

  await tx.notification.updateMany({ where: { incident: { reportedByDriverId: driverId } }, data: { incidentId: null } });
  await tx.incident.deleteMany({ where: { reportedByDriverId: driverId } });

  await tx.workflowEvent.updateMany({ where: { assignment: { driverId } }, data: { assignmentId: null } });
  await tx.incident.updateMany({ where: { assignment: { driverId } }, data: { assignmentId: null } });
  await tx.jobAssignment.deleteMany({ where: { driverId } });
  await tx.jobRequest.deleteMany({ where: { driverId } });

  await tx.message.deleteMany({ where: inDriverMessages });
  await tx.conversation.deleteMany({ where: { driverId } });

  await tx.message.updateMany({ where: { senderDriverId: driverId }, data: { senderDriverId: null } });
  await tx.jobSummary.updateMany({ where: { driverId }, data: { driverId: null } });
  await tx.auditLog.updateMany({ where: { actorDriverId: driverId }, data: { actorDriverId: null } });

  await tx.driver.deleteMany({ where: { id: driverId, organizationId } });
}

/** Note the time of a driver's latest WhatsApp message on the number it came from (digits only). */
const noteWhatsappActivity = (tx, driverId, waId) => tx.$executeRaw(Prisma.sql`
  UPDATE driver_whatsapp_accounts SET last_message_at = now()
   WHERE driver_id = ${driverId}::uuid AND regexp_replace(phone_e164, '\\D', '', 'g') = ${waId}`);

async function findDriverProfile(client, organizationId, id) {
  const row = await client.driver.findFirst({
    where: { id, organizationId },
    select: {
      ...LIST_SELECT, createdAt: true, activeJobId: true,
      jobAssignments: {
        where: { job: { organizationId } }, orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }], take: 100,
        select: {
          id: true, status: true, assignedAt: true, acceptedAt: true, startedAt: true,
          completedAt: true, cancelledAt: true,
          job: { select: { id: true, jobNumber: true, currentStatus: true, cargoDescription: true, pickupAt: true } },
        },
      },
    },
  });
  return row ? { ...flatten(row), createdAt: row.createdAt, activeJobId: row.activeJobId, trips: row.jobAssignments } : null;
}

module.exports = {
  findDriverProfile,
  noteWhatsappActivity,
  listDrivers, findDriver, insertDriver, updateFields, setStatus, replacePrimaryPhone, deleteDriverCascade,
};
