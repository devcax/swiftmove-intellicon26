const whatsapp = require('../../platform/whatsappClient');
const { firstName } = require('../../platform/names');

/** The welcome a new driver receives, word for word as the dashboard has always sent it. */
function welcomeText({ name, vehicleType }) {
  return [
    `Welcome aboard, ${firstName(name)}! You're registered as a fleet driver${vehicleType ? ` with your ${vehicleType}` : ''}.`,
    '',
    'Everything runs over this WhatsApp chat:',
    '• When a new job fits your vehicle, I send it here with a Confirm button. First to confirm gets it.',
    '• Say "jobs" anytime to see open work that fits your vehicle.',
    '• Say "start" when you begin the trip. Trips can be started from 24 hours before the scheduled pickup, not earlier.',
    '• Keep me posted as you go: "reached pickup", "on my way", "at delivery".',
    '• At pickup and at delivery, send a clear photo of the delivery note. The code on it verifies the stage automatically.',
    '• Running late? Just tell me what is happening and why, and the manager is informed.',
    '• Accident, breakdown, damage, shortage or a refused delivery? Message me what happened, with a photo if you can. It is logged as an incident and the manager is alerted right away.',
    '• Delivered? Say "close the job" and it goes straight to the manager for closure.',
    '',
    'Say "help" anytime to see the command list again. Drive safe!',
  ].join('\n');
}

/**
 * driver.created: welcome the driver on WhatsApp. Reads the driver through the driver.get query, never
 * through the drivers module's tables. A driver deleted before delivery is skipped. If the send fails the
 * dispatcher retries it, which the old route never did.
 */
async function driverWelcome({ event, query }) {
  let driver;
  try {
    driver = await query('driver.get', { id: event.payload.driverId });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return;
    throw err;
  }
  if (!driver.phone) return;
  await whatsapp.sendTextMessage(driver.phone.replace(/\D/g, ''), welcomeText(driver));
}

module.exports = { driverWelcome, welcomeText };
