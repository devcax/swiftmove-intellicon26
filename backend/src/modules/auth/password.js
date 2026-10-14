const argon2 = require('argon2');

// Argon2id: memory 19 MiB, 2 iterations, 1 lane.
const OPTIONS = Object.freeze({ type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

const hashPassword = (password) => argon2.hash(password, OPTIONS);

/** False for a wrong password and for a stored value that is not a valid hash. Never throws on bad input. */
async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** True when the stored hash was made with older or different parameters. */
function needsRehash(hash) {
  try {
    return argon2.needsRehash(hash, OPTIONS);
  } catch {
    return false;
  }
}

// An unknown email still costs one verification, so response time does not reveal which emails exist.
let dummyHash;
const verifyAgainstDummy = async (password) => {
  dummyHash ??= hashPassword('not-a-real-password-for-timing-only');
  await verifyPassword(await dummyHash, password);
  return false;
};

module.exports = { hashPassword, verifyPassword, needsRehash, verifyAgainstDummy };
