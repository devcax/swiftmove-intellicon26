/**
 * Sending to the outside world on the system's behalf. Modules call this instead of reaching for a messaging client, so which client
 * sends (WhatsApp today) is not their concern, and a test can swap it.
 */
const whatsapp = require('./whatsappClient');

/** Send a text to a phone number (E.164). Resolves to the provider's message id (or null), rejects when it could not be sent. */
const sendText = (phone, text) => whatsapp.sendTextMessage(phone, text);

module.exports = { sendText };
