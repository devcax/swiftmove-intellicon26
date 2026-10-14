/**
 * Send a one-off WhatsApp text message using the credentials in .env.
 * Usage: node scripts/send-test.js <toDigits> <message...>
 * Example: node scripts/send-test.js 94719938765 "What can I help you today?"
 */
require('dotenv').config();
const { sendTextMessage } = require('../../src/platform/whatsappClient');

async function main() {
  const [to, ...text] = process.argv.slice(2);
  if (!to || text.length === 0) {
    console.error('Usage: node scripts/send-test.js <toDigits> <message...>');
    process.exit(1);
  }
  const wamid = await sendTextMessage(to, text.join(' '));
  console.log('Sent. WhatsApp message id:', wamid);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
