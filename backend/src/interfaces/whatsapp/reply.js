/** Say something to the driver: store it, send it as text, buttons or a list, and mark it sent or failed. */
const { logger } = require("../../platform/logger");
const whatsapp = require("../../platform/whatsappClient");
const { sanitizeVoice } = require("./ai/companion");
const repo = require("./repo");
const { planReply } = require("./replyParts");

async function reply({
  conversationId,
  phone,
  body,
  buttons = null,
  listRows = null,
}) {
  const text = sanitizeVoice(body);
  const cleanButtons = buttons
    ? buttons.map((b) => ({ ...b, title: sanitizeVoice(b.title) }))
    : null;
  const cleanRows = listRows
    ? listRows.map((r) => ({
        ...r,
        title: sanitizeVoice(r.title),
        ...(r.description ? { description: sanitizeVoice(r.description) } : {}),
      }))
    : null;

  let lastMessageId;
  for (const part of planReply({ text, buttons: cleanButtons, listRows: cleanRows })) {
    const result = await sendReplyPart({ conversationId, phone, ...part });
    lastMessageId = result.messageId;
    if (!result.sent) break;
  }
  await repo.touchConversation(conversationId);
  return lastMessageId;
}

async function sendReplyPart({ conversationId, phone, body: text, buttons: cleanButtons, listRows: cleanRows }) {

  const messageId = await repo.insertBotMessage({
    conversationId,
    type: cleanButtons || cleanRows ? "BUTTON" : "TEXT",
    text,
  });

  try {
    let wamid;
    if (cleanButtons)
      wamid = await whatsapp.sendInteractiveButtons(phone, text, cleanButtons);
    else if (cleanRows)
      wamid = await whatsapp.sendInteractiveList(
        phone,
        text,
        "Choose",
        cleanRows,
      );
    else wamid = await whatsapp.sendTextMessage(phone, text);

    await repo.markMessageSent(messageId, wamid);
    return { messageId, sent: true };
  } catch (err) {
    await repo.markMessageFailed(messageId);
    logger.error({ err }, `Bot reply ${messageId} failed to send`);
    return { messageId, sent: false };
  }
}

module.exports = { reply };
