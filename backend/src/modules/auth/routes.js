const express = require('express');
const service = require('./service');
const { loginSchema, changePasswordSchema } = require('./schemas');
const { setSessionCookie, clearSessionCookie, sessionTokenOf } = require('../../platform/http/cookies');

/** /api/auth. `authenticate` guards the routes that need a session; login and logout do not. */
function createAuthRouter({ authenticate, loginLimiters = [] }) {
  const router = express.Router();

  router.post('/login', ...loginLimiters, async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { token, user } = await service.login({ email, password, ip: req.ip, userAgent: req.get('user-agent') });
    setSessionCookie(res, token);
    res.json(user);
  });

  router.post('/logout', async (req, res) => {
    await service.logout(sessionTokenOf(req));
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.get('/me', authenticate, (req, res) => {
    const { userId, name, email, organizationId, roles } = req.actor;
    res.json({ id: userId, name, email, organizationId, roles });
  });

  router.post('/change-password', authenticate, async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    await service.changePassword({
      userId: req.actor.userId, sessionId: req.actor.sessionId,
      currentPassword: input.currentPassword, newPassword: input.newPassword,
    });
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createAuthRouter };
