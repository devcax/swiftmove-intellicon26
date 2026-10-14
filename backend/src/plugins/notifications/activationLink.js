const whatsapp = require('../../platform/whatsappClient');
const config = require('../../platform/config');
const { firstName } = require('../../platform/names');

/** The address the driver opens: the dashboard's public address and the random part of their link. */
function activationUrl(token, base = config.appPublicUrl ?? config.corsOrigins?.[0]) {
  if (!base) return null;
  return `${String(base).replace(/\/+$/, '')}/activate/${token}`;
}

function activationText({ name, url }) {
  return [
    `Hi ${firstName(name)}, you have been added as a driver.`,
    '',
    'Please open this link to activate your WhatsApp number. The assistant cannot reply to you until you do:',
    url,
    '',
    'The link works once and expires in 7 days. If it does not open, ask your fleet manager to send a new one.',
  ].join('\n');
}

/**
 * driver.activationRequested: send the driver their activation link. The link is read through the driver.activationLink query, which only the
 * system may call, never carried in the event. A driver deleted or already verified before delivery is skipped. If the public address is not
 * configured the send fails loudly, so the dispatcher keeps retrying and the operator sees why instead of a driver getting a dead link.
 */
async function activationLink({ event, query }) {
  const link = await query('driver.activationLink', { driverId: event.payload.driverId });
  if (!link) return;
  const url = activationUrl(link.token);
  if (!url) throw new Error('APP_PUBLIC_URL is not set, so the activation link cannot be built.');
  await whatsapp.sendTextMessage(link.phone.replace(/\D/g, ''), activationText({ name: link.name, url }));
}

module.exports = { activationLink, activationUrl, activationText };
