const { ValidationError } = require('../../platform/errors');

const MAX_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const fail = (path, message) => { throw new ValidationError(message, { details: [{ path, message }] }); };

/** Action-level schedule checks cannot be bypassed by calling the API directly. */
// The dashboard picks whole minutes, so a pickup in the current minute is still "now", not the past.
function validateJobSchedule(pickupAt, deliveryAt, { now = Date.now(), leadMs = 0, graceMs = 0 } = {}) {
  if (!(pickupAt instanceof Date) || !Number.isFinite(pickupAt.getTime())) fail('pickupAt', 'Choose a valid pickup date and time.');
  if (pickupAt.getTime() < now + leadMs - graceMs) fail('pickupAt', leadMs ? 'Pickup must be at least 1 hour from now.' : 'Pickup cannot be in the past.');
  if (deliveryAt == null) return;
  if (!(deliveryAt instanceof Date) || !Number.isFinite(deliveryAt.getTime())) fail('deliveryAt', 'Choose a valid delivery date and time.');
  if (deliveryAt <= pickupAt) fail('deliveryAt', 'Delivery must be after the pickup time.');
  if (deliveryAt.getTime() - pickupAt.getTime() > MAX_WINDOW_MS) fail('deliveryAt', 'Delivery must be within 2 days of pickup.');
}

function validateCoordinate(value, name) {
  if (value == null) return null;
  if (typeof value !== 'object' || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)
    || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) fail(name, 'Select a valid location on the map.');
  return { latitude: Number(value.latitude.toFixed(6)), longitude: Number(value.longitude.toFixed(6)) };
}

function normalizeUnit(value) {
  const unit = String(value ?? '').trim() || 'Units';
  if (unit.toLowerCase() === 'other' || unit.length > 60) fail('unit', 'Enter a unit name of 1–60 characters.');
  return unit;
}

function validateDateInput(raw, parsed, path) {
  if (raw != null && String(raw).trim() && !parsed) fail(path, 'Enter a valid date and time.');
}

module.exports = { validateJobSchedule, validateCoordinate, normalizeUnit, validateDateInput };
