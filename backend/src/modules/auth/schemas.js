const { z } = require('zod');

const email = z.string().trim().min(3).max(255).email();

// Existing passwords remain usable at login; the minimum applies to new passwords only.
const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(128),
}).strict();

// New passwords: 8 to 128 characters, no other composition rules.
const newPassword = z.string().min(8, 'Use at least 8 characters.').max(128, 'Use at most 128 characters.');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword,
}).strict();

const createUserSchema = z.object({
  email,
  name: z.string().trim().min(1).max(160),
  password: newPassword,
  role: z.enum(['ADMIN', 'MANAGER']).default('MANAGER'),
  organizationId: z.guid().optional(), // guid, not uuid: seeded ids such as 0000...0001 are not RFC UUIDs
}).strict();

module.exports = {
  createUserSchema, loginSchema, changePasswordSchema, newPassword };
