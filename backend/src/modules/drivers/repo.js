/**
 * Every Prisma call for drivers. Each function takes the client first, so it works with the global
 * client (queries) and with a transaction (actions). Every call filters by organization.
 */
const crypto = require('crypto');
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
const DETAIL_FIELDS = { address: true, nic: true, dateOfBirth: true, bankName: true, bankBranch: true, bankAccountHolder: true, bankAccountNumber: true };
const DETAIL_SELECT = { ...LIST_SELECT, ...DETAIL_FIELDS };
const detailData = (input) => Object.fromEntries(Object.keys(DETAIL_FIELDS)
  .filter(key => input[key] !== undefined)
  .map(key => [key, key === 'dateOfBirth' && input[key] ? new Date(`${input[key]}T00:00:00Z`) : input[key]]));

function flatten(row) {
  const account = row.driverWhatsappAccounts[0];
  return {
    id: row.id, name: row.name, status: row.status, vehicleType: row.vehicleType, licensePlate: row.licensePlate,
    phone: account?.phoneE164, verificationStatus: account?.verificationStatus,
    currentJob: row.activeJob?.jobNumber, completedTrips: row._count.jobAssignments,
    ...Object.fromEntries(Object.keys(DETAIL_FIELDS).filter(key => key in row).map(key => [key, row[key]])),
  };
}

async function listDrivers(client, organizationId) {
  const rows = await client.driver.findMany({
    where: { organizationId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: LIST_SELECT, take: 1000,
  });
  return rows.map(flatten);
}

async function findDriver(client, organizationId, id) {
  const row = await client.driver.findFirst({ where: { id, organizationId }, select: DETAIL_SELECT });
  return row ? flatten(row) : null;
}

/** A new driver is ACTIVE, but their number stays unverified until they open the activation link sent to it. */
const insertDriver = (tx, organizationId, input) => orConflict(() => tx.driver.create({
  data: {
    organizationId, name: input.name, status: 'ACTIVE', vehicleType: input.vehicleType, licensePlate: input.licensePlate, ...detailData(input),
    driverWhatsappAccounts: { create: { phoneE164: input.phone, isPrimary: true, verificationStatus: 'UNVERIFIED' } },
  },
  select: { id: true, driverWhatsappAccounts: { select: { id: true }, take: 1 } },
}));

const updateFields = (tx, organizationId, id, input) => orConflict(() => tx.driver.updateMany({
  where: { id, organizationId }, data: { name: input.name, status: input.status, vehicleType: input.vehicleType, licensePlate: input.licensePlate, ...detailData(input) },
}));

const setStatus = (tx, organizationId, id, status) => tx.driver.updateMany({ where: { id, organizationId }, data: { status } });

/** Change the primary number. A different number has to be verified again; the same one keeps its status. Says which account it is and whether the number changed. */
async function replacePrimaryPhone(tx, driverId, phone) {
  const previous = await tx.driverWhatsappAccount.findFirst({ where: { driverId, isPrimary: true } });
  if (!previous) {
    const created = await orConflict(() => tx.driverWhatsappAccount.create({
      data: { driverId, phoneE164: phone, isPrimary: true, verificationStatus: 'UNVERIFIED' }, select: { id: true },
    }));
    return { accountId: created.id, changed: true };
  }
  const changed = previous.phoneE164 !== phone;
  const verificationStatus = changed ? 'UNVERIFIED' : previous.verificationStatus;
  await orConflict(() => tx.driverWhatsappAccount.update({ where: { id: previous.id }, data: { phoneE164: phone, verificationStatus } }));
  return { accountId: previous.id, changed };
}

// ------------------------------------------------------------ activation links

const ACTIVATION_DAYS = 7;

/** The driver's primary number account: its id and whether it is verified. */
const findPrimaryAccount = (client, driverId) => client.driverWhatsappAccount.findFirst({
  where: { driverId, isPrimary: true }, select: { id: true, phoneE164: true, verificationStatus: true },
});

/** A new one-time link for the account. Any link sent before stops working. */
async function issueActivation(tx, accountId, now = new Date()) {
  await tx.driverActivation.deleteMany({ where: { accountId, usedAt: null } });
  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(now.getTime() + ACTIVATION_DAYS * 24 * 60 * 60 * 1000);
  await tx.driverActivation.create({ data: { accountId, token, expiresAt } });
  return { token, expiresAt };
}

/** The newest unused link of the driver's primary number, or null. */
const findOpenActivation = (client, driverId) => client.driverActivation.findFirst({
  where: { usedAt: null, account: { driverId, isPrimary: true } }, orderBy: { createdAt: 'desc' },
  select: { token: true, expiresAt: true, account: { select: { phoneE164: true, driver: { select: { name: true, vehicleType: true, organizationId: true } } } } },
});

/** The link with who it is for, whatever state it is in. */
const findActivation = (client, token) => client.driverActivation.findUnique({
  where: { token },
  select: {
    id: true, usedAt: true, expiresAt: true,
    account: { select: { id: true, verificationStatus: true, driver: { select: { id: true, name: true, status: true, organizationId: true } } } },
  },
});

/** The number is theirs: mark it verified and use up the link (and any other open ones). */
async function markVerified(tx, activation) {
  await tx.driverWhatsappAccount.update({ where: { id: activation.account.id }, data: { verificationStatus: 'VERIFIED' } });
  await tx.driverActivation.updateMany({ where: { accountId: activation.account.id, usedAt: null }, data: { usedAt: new Date() } });
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
      ...DETAIL_SELECT, createdAt: true, activeJobId: true,
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
  findPrimaryAccount, issueActivation, findOpenActivation, findActivation, markVerified,
  findDriverProfile,
  noteWhatsappActivity,
  listDrivers, findDriver, insertDriver, updateFields, setStatus, replacePrimaryPhone, deleteDriverCascade,
};
