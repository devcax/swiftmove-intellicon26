const crypto = require('crypto');

function generateJobNumber() {
  return `JOB-${Date.now().toString().slice(-6)}${crypto.randomInt(0, 100).toString().padStart(2, '0')}`;
}

/** `PU-` or `DL-` plus six characters that cannot be misread on a document (no 0, O, 1, I). */
function generateSecurityCode(prefix) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 6; i += 1) body += alphabet[crypto.randomInt(alphabet.length)];
  return `${prefix}-${body}`;
}

module.exports = { generateJobNumber, generateSecurityCode };
