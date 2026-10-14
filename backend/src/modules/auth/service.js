const repo = require('./repo');
const { hashPassword, verifyPassword, needsRehash, verifyAgainstDummy } = require('./password');
const { AuthenticationError, ValidationError, ConflictError } = require('../../platform/errors');
const { createUserSchema } = require('./schemas');
const { SESSION_TTL_MS } = require('../../platform/http/cookies');

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
// One message for an unknown email, a wrong password, a locked and an inactive account.
const LOGIN_FAILED = 'Email or password is incorrect.';

const publicUser = (user) => ({
  id: user.id, name: user.name, email: user.email, organizationId: user.organizationId, roles: repo.rolesOf(user),
});

/** Check credentials, record the attempt, and open a session. Returns the raw token once. */
async function login({ email, password, ip, userAgent }) {
  const user = await repo.findUserByEmail(email);
  const locked = Boolean(user?.lockedUntil && user.lockedUntil > new Date());
  const usable = Boolean(user) && user.status === 'ACTIVE' && !locked;
  // Exactly one hash verification on every path, so timing does not reveal which case it was.
  const correct = usable ? await verifyPassword(user.passwordHash, password) : await verifyAgainstDummy(password);
  await repo.recordAttempt({ email, ip, succeeded: correct });
  if (!correct) {
    if (usable) await repo.recordFailure(user.id, { maxFailures: MAX_FAILURES, lockMs: LOCK_MS });
    throw new AuthenticationError(LOGIN_FAILED);
  }
  await repo.clearFailures(user.id, needsRehash(user.passwordHash) ? { passwordHash: await hashPassword(password) } : {});
  const token = await repo.createSession({
    userId: user.id, organizationId: user.organizationId, ip, userAgent, ttlMs: SESSION_TTL_MS,
  });
  return { token, user: publicUser(user) };
}

const logout = (token) => (token ? repo.revokeSessionByToken(token) : undefined);

/** Needs the current password. Ends every other session of the user. */
async function changePassword({ userId, sessionId, currentPassword, newPassword }) {
  const user = await repo.findUserById(userId);
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new ValidationError('Your current password is incorrect.', {
      details: [{ path: 'currentPassword', message: 'Your current password is incorrect.' }],
    });
  }
  await repo.updatePassword(userId, await hashPassword(newPassword));
  await repo.revokeOtherSessions(userId, sessionId);
}

/** Create a dashboard user. Used by scripts/create-user.js; there is no public sign-up. */
async function createUser(rawInput) {
  const { email, name, password, role, organizationId } = createUserSchema.parse(rawInput);
  if (await repo.findUserByEmail(email)) throw new ConflictError('A user with that email already exists.');
  const organizations = organizationId ? [{ id: organizationId }] : await repo.listOrganizations();
  if (organizations.length !== 1) {
    throw new ValidationError('Name the organization with --org when there is more than one.');
  }
  return repo.createUser({
    organizationId: organizations[0].id, name, email, roleCode: role, passwordHash: await hashPassword(password),
  });
}

module.exports = {
  createUser, login, logout, changePassword, publicUser, LOGIN_FAILED, MAX_FAILURES, LOCK_MS };
