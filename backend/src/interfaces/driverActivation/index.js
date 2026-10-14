/**
 * The public page behind the activation link a new driver receives on WhatsApp. It is the one place a driver (not a signed-in manager)
 * touches the API, so it does exactly two things: say what a link is, and, when the driver presses the button, verify their number.
 * Opening the link changes nothing; a link preview (WhatsApp fetches links) must never verify a number by itself.
 */
const express = require('express');
const runner = require('../../platform/runner');
const { AppError } = require('../../platform/errors');

const SYSTEM = { type: 'SYSTEM', source: 'ACTIVATION_LINK' };
const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

const invalid = () => new AppError('This activation link is not valid.', { code: 'ACTIVATION_LINK_INVALID', status: 404, expose: true });

async function lookup(token) {
  if (!TOKEN.test(token)) throw invalid();
  const found = await runner.runQuery('driver.activationLookup', { token }, SYSTEM);
  if (found.state === 'invalid') throw invalid();
  return found;
}

function createDriverActivationRouter() {
  const router = express.Router();

  router.get('/:token', async (req, res, next) => {
    try {
      const { state, firstName } = await lookup(req.params.token);
      res.set('Cache-Control', 'no-store').json({ state, firstName });
    } catch (err) { next(err); }
  });

  router.post('/:token', async (req, res, next) => {
    try {
      const found = await lookup(req.params.token);
      if (found.state === 'expired') throw new AppError('This activation link has expired. Ask your fleet manager to send a new one.', { code: 'ACTIVATION_LINK_INVALID', status: 410, expose: true });
      await runner.run('driver.activate', { token: req.params.token, driverId: found.driverId }, { ...SYSTEM, organizationId: found.organizationId });
      res.set('Cache-Control', 'no-store').json({ state: 'verified', firstName: found.firstName });
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { createDriverActivationRouter };
