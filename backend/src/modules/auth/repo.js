const crypto = require('crypto');
const { prisma } = require('../../platform/db');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

const userSelect = {
  id: true, organizationId: true, name: true, email: true, passwordHash: true, status: true,
  failedLoginCount: true, lockedUntil: true,
  userRoles: { select: { role: { select: { code: true } } } },
};

const rolesOf = (user) => user.userRoles.map((link) => link.role.code);

// Email is unique per organization, not globally: the oldest match wins until login names an organization.
const findUserByEmail = (email) => prisma.user.findFirst({
  where: { email: { equals: email, mode: 'insensitive' } },
  orderBy: { createdAt: 'asc' },
  select: userSelect,
});

const recordAttempt = ({ email, ip, succeeded }) => prisma.loginAttempt.create({
  data: { email: email.slice(0, 255), ip: ip?.slice(0, 64) ?? null, succeeded },
});

/** Count a failure; at the limit lock the account and start a fresh count for after the lock. */
async function recordFailure(userId, { maxFailures, lockMs }) {
  const { failedLoginCount } = await prisma.user.update({
    where: { id: userId }, data: { failedLoginCount: { increment: 1 } }, select: { failedLoginCount: true },
  });
  if (failedLoginCount < maxFailures) return false;
  await prisma.user.update({
    where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + lockMs) },
  });
  return true;
}

const clearFailures = (userId, extra = {}) => prisma.user.update({
  where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null, ...extra },
});

/** Create a session and return the raw token. Only its SHA-256 hash is stored. */
async function createSession({ userId, organizationId, ip, userAgent, ttlMs }) {
  const token = newToken();
  await prisma.session.create({
    data: {
      userId, organizationId, tokenHash: sha256(token), ip: ip?.slice(0, 64) ?? null,
      userAgent: userAgent?.slice(0, 400) ?? null, expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return token;
}

/** The live session for a raw token, with its user and roles, or null. */
async function findLiveSession(token) {
  const session = await prisma.session.findFirst({
    where: { tokenHash: sha256(token), revokedAt: null, expiresAt: { gt: new Date() }, user: { status: 'ACTIVE' } },
    select: {
      id: true, lastSeenAt: true, userId: true, organizationId: true,
      user: { select: { name: true, email: true, userRoles: userSelect.userRoles } },
    },
  });
  if (!session) return null;
  return {
    id: session.id, lastSeenAt: session.lastSeenAt, userId: session.userId, organizationId: session.organizationId,
    name: session.user.name, email: session.user.email, roles: rolesOf(session.user),
  };
}

const touchSession = (id, ttlMs) => prisma.session.update({
  where: { id }, data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + ttlMs) },
});

const revokeSessionByToken = (token) => prisma.session.updateMany({
  where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() },
});

const revokeOtherSessions = (userId, keepSessionId) => prisma.session.updateMany({
  where: { userId, revokedAt: null, id: { not: keepSessionId } }, data: { revokedAt: new Date() },
});

const findUserById = (id) => prisma.user.findFirst({ where: { id }, select: userSelect });

const updatePassword = (userId, passwordHash) => prisma.user.update({
  where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() },
});

const replaceHash = (userId, passwordHash) => prisma.user.update({ where: { id: userId }, data: { passwordHash } });

const listOrganizations = () => prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' }, take: 50 });

const createUser = ({ organizationId, name, email, passwordHash, roleCode }) => prisma.user.create({
  data: {
    organizationId, name, email, passwordHash, passwordChangedAt: new Date(),
    userRoles: { create: { role: { connect: { code: roleCode } } } },
  },
  select: { id: true, email: true },
});

module.exports = {
  listOrganizations, createUser,
  rolesOf, findUserByEmail, recordAttempt, recordFailure, clearFailures, createSession, findLiveSession,
  touchSession, revokeSessionByToken, revokeOtherSessions, findUserById, updatePassword, replaceHash,
};
