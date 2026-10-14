const { z } = require('zod');
const { APP_TIMEZONE } = require('../../platform/time');

const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const MESSAGES = {
  name: 'Driver name is required (min. 3 characters).',
  phone: 'Enter a valid Sri Lankan mobile number (e.g. +94 77 123 4567).',
  vehicleType: 'Vehicle type is required.',
  licensePlate: 'License plate is required (e.g. ED-1234 or WP CBA-4412).',
};

/** Accepts 0771234567, +94 77 123 4567, 94771234567, 0094771234567 and 771234567. Returns +94771234567 or null. */
function normalizeSriLankanPhone(raw) {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('0094')) digits = digits.slice(4);
  else if (digits.startsWith('94')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^7\d{8}$/.test(digits)) return null;
  return `+94${digits}`;
}

/** Accepts ED-1234 or WP CBA-4412 in any case, with extra spaces. Returns it upper-cased, or null. */
function normalizeLicensePlate(raw) {
  const upper = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  return /^[A-Z]{1,2} ?[A-Z]{1,3}-[0-9]{1,4}$/.test(upper) ? upper : null;
}

/** A value that is normalized, or rejected with the exact message the dashboard has always shown. */
// optional() first: a missing key must reach the transform and get this message, not zod's own.
const normalized = (normalize, message) => z.unknown().optional().transform((raw, ctx) => {
  const value = normalize(raw);
  if (value === null) ctx.issues.push({ code: 'custom', message, input: raw });
  return value;
});

const name = z.string({ error: MESSAGES.name }).trim()
  .min(3, MESSAGES.name).max(160, 'Driver name is too long (max. 160 characters).');
const phone = normalized(normalizeSriLankanPhone, MESSAGES.phone);
const vehicleType = z.string({ error: MESSAGES.vehicleType }).trim()
  .min(1, MESSAGES.vehicleType).max(60, 'Vehicle type is too long (max. 60 characters).');
const licensePlate = normalized(normalizeLicensePlate, MESSAGES.licensePlate);
const id = z.guid();

/** A status that may arrive in any case. The message quotes what was sent, as it always has. */
const status = (fallback) => z.unknown().optional().transform((raw, ctx) => {
  const value = String(raw ?? fallback ?? '').toUpperCase();
  if (!STATUSES.includes(value)) ctx.issues.push({ code: 'custom', message: `Invalid status "${raw}".`, input: raw });
  return value;
});

const optionalText = (max) => z.string().trim().max(max).nullable().optional().transform(value => value === '' ? null : value);
const dateOfBirth = optionalText(10).refine(value => {
  if (value == null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= today;
}, 'Enter a valid date of birth that is not in the future.');
const fields = {
  name, phone, vehicleType, licensePlate,
  address: optionalText(1000), nic: optionalText(20).transform(value => value?.toUpperCase() ?? value), dateOfBirth,
  bankName: optionalText(160), bankBranch: optionalText(160), bankAccountHolder: optionalText(160), bankAccountNumber: optionalText(80),
};

// A status sent on create is accepted for compatibility and ignored: a new driver is always ACTIVE.
// evidenceRef: the id the form used for evidence it collected before the driver existed (see the evidence module).
const createSchema = z.object({ ...fields, status: z.unknown().optional(), evidenceRef: z.guid().optional() }).strict();
const updateSchema = z.object({ id, ...fields, status: status('ACTIVE') }).strict();
const updateStatusSchema = z.object({ id, status: status(undefined) }).strict();
const idSchema = z.object({ id }).strict();
const listSchema = z.object({}).strict();

module.exports = {
  STATUSES, MESSAGES, normalizeSriLankanPhone, normalizeLicensePlate,
  createSchema, updateSchema, updateStatusSchema, idSchema, listSchema,
};
