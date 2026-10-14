const { APP_TIMEZONE, formatWhen } = require('../../platform/time');

function address(job, stop) {
  const parts = [job[stop], job[`${stop}_address`], job[`${stop}_city`]]
    .map(value => String(value ?? '').trim()).filter(Boolean);
  return parts.filter((part, index) => !parts.slice(0, index).some(earlier => earlier.toLowerCase().includes(part.toLowerCase()))).join(', ') || 'Not provided';
}

function quantity(job) {
  if (job.quantity == null || String(job.quantity).trim() === '') return 'Not specified';
  const value = Number(job.quantity);
  const amount = Number.isFinite(value) ? new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(value) : String(job.quantity);
  return [amount, job.unit].filter(Boolean).join(' ');
}

function scheduled(value) {
  return formatWhen(value, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) || 'Not scheduled';
}

/** One consistent WhatsApp card for automatic suggestions and the driver's jobs reply. Security codes are never included. */
function formatJobDetails(job) {
  const notes = String(job.special_instructions ?? '').trim();
  return [
    `*${job.job_number}*`,
    `*Cargo:* ${job.cargo_description || 'Not specified'}`,
    `*Quantity:* ${quantity(job)}`,
    '',
    '*Pickup*',
    `Address: ${address(job, 'pickup')}`,
    `When: ${scheduled(job.pickup_at)}`,
    '',
    '*Delivery*',
    `Address: ${address(job, 'delivery')}`,
    `When: ${scheduled(job.delivery_at)}`,
    ...(notes ? ['', '*Notes:*', notes] : []),
    '',
    `Times: ${APP_TIMEZONE}`,
  ].join('\n');
}

function formatAvailableJobs(jobs) {
  return `*Available jobs*\n\n${jobs.map(formatJobDetails).join('\n\n──────────\n\n')}\n\nChoose a job below to request manager approval.`;
}

function formatJobInvite(job, driver) {
  return [
    '*New job available*',
    driver.vehicle_type ? `Suitable for your ${driver.vehicle_type}.` : null,
    formatJobDetails(job),
    'Tap *Apply now* to request manager approval.',
  ].filter(Boolean).join('\n\n');
}

module.exports = { formatJobDetails, formatAvailableJobs, formatJobInvite };
