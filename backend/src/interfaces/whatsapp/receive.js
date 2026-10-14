/**
 * A message from WhatsApp arrives: find out which driver it is, keep it (and any photo, document or voice note) with the conversation,
 * ignore it if it was delivered twice, and hand it to the bot. Nothing here decides anything about a job.
 */
const { logger } = require("../../platform/logger");
const runner = require("../../platform/runner");
const whatsapp = require("../../platform/whatsappClient");
const { processInbound } = require("./inbound");
const { storeInboundMedia } = require("./mirror");
const { firstName } = require("../../platform/names");
const repo = require("./repo");

const MEDIA_TYPES = ["audio", "image", "document", "video"];
const BOT_TYPES = ["TEXT", "BUTTON", "AUDIO", "IMAGE", "DOCUMENT", "LOCATION"];

/** What kind of message this is and its text, in the words the rest of the code uses. */
function extractContent(message) {
  switch (message.type) {
    case "text":
      return { messageType: "TEXT", bodyText: message.text?.body ?? "" };
    case "audio":
      return { messageType: "AUDIO", bodyText: "[Voice message]" };
    case "image":
      return { messageType: "IMAGE", bodyText: message.image?.caption || "[Image]" };
    case "document":
      return { messageType: "DOCUMENT", bodyText: message.document?.caption || "[Document]" };
    case "video":
      return { messageType: "VIDEO", bodyText: message.video?.caption || "[Video]" };
    case "location":
      return {
        messageType: "LOCATION",
        bodyText: `${message.location?.latitude},${message.location?.longitude}`,
      };
    case "button":
      return { messageType: "BUTTON", bodyText: message.button?.text ?? "", buttonId: message.button?.payload ?? null };
    case "interactive": {
      const choice = message.interactive?.button_reply ?? message.interactive?.list_reply;
      return { messageType: "BUTTON", bodyText: choice?.title ?? "[Interactive reply]", buttonId: choice?.id ?? null };
    }
    default:
      return { messageType: "SYSTEM", bodyText: `[Unsupported message type: ${message.type}]` };
  }
}

/** The driver's open conversation, started when they have none; kept pointing at the job they are on. */
async function conversationFor(driver) {
  const open = await repo.findOpenConversationOf(driver.driver_id);
  if (!open) {
    const id = await repo.createConversation({ organizationId: driver.organization_id, driverId: driver.driver_id, jobId: driver.active_job_id });
    return { id, aiPaused: false };
  }
  if (driver.active_job_id && open.jobId !== driver.active_job_id) await repo.setConversationJob(open.id, driver.active_job_id);
  return { id: open.id, aiPaused: open.aiPausedAt != null };
}

const UNVERIFIED_REPLY_GAP_MS = 30 * 60 * 1000;
const unverifiedRepliedAt = new Map(); // wa id -> when the "activate first" reply last went out

/**
 * A number whose driver has not opened the activation link is not allowed to talk to the assistant: nothing is stored, nothing reaches the
 * AI, and they are told once in a while how to activate. (A busy sender cannot make this chatty: one reply per number per half hour.)
 */
async function turnAwayUnverified(driver, waId, now = Date.now()) {
  const last = unverifiedRepliedAt.get(waId) ?? 0;
  if (now - last < UNVERIFIED_REPLY_GAP_MS) return;
  unverifiedRepliedAt.set(waId, now);
  await whatsapp.sendTextMessage(
    waId,
    `Hi ${firstName(driver.name)}, your number is not activated yet, so I cannot help you here. Please open the activation link we sent you on WhatsApp. If you cannot find it, ask your fleet manager to send a new one.`,
  ).catch((err) => logger.error({ err }, "Activation reminder failed"));
}

async function receiveMessage(message, { deferBot = false } = {}) {
  const waId = message.from;

  const driver = await repo.findDriverByWhatsapp(waId);
  if (!driver) {
    await whatsapp.sendTextMessage(
      waId,
      "This number is not registered with our fleet. Please contact your fleet manager to register as a driver.",
    ).catch((err) => logger.error({ err }, "Registration reply failed"));
    logger.info("Inbound message from an unregistered number: registration reply sent.");
    return;
  }

  if (driver.verification_status !== "VERIFIED") {
    await turnAwayUnverified(driver, waId);
    logger.info("Inbound message from a number that is not verified yet: nothing stored, the assistant was not used.");
    return;
  }

  const conversation = await conversationFor(driver);
  const { messageType, bodyText, buttonId } = extractContent(message);
  const storedMessageId = await repo.insertDriverMessage({
    conversationId: conversation.id, externalMessageId: message.id, driverId: driver.driver_id, messageType, bodyText, timestamp: message.timestamp,
  });
  if (!storedMessageId) return; // delivered twice: already handled

  const media = message[message.type];
  if (media && media.id && MEDIA_TYPES.includes(message.type)) {
    await repo.insertAttachment({
      messageId: storedMessageId, type: message.type.toUpperCase(), storageKey: media.id, filename: media.filename ?? null,
      mimeType: media.mime_type ?? "application/octet-stream", transcript: media.transcript ?? null,
    });
    if (["image", "document", "video"].includes(message.type)) {
      storeInboundMedia(storedMessageId, driver.active_job_id ?? driver.driver_id)
        .catch((err) => logger.error({ err }, `R2 mirror failed for message ${storedMessageId}`));
    }
  }

  if (!conversation.aiPaused && messageType === "VIDEO") {
    await whatsapp.sendTextMessage(
      waId,
      "Sorry, I cannot process videos. Please send a clear photo instead so I can help you.",
    ).catch((err) => logger.error({ err }, "Video rejection reply failed"));
  }

  let input = null;
  if (!conversation.aiPaused && BOT_TYPES.includes(messageType)) {
    input = {
      driver: { ...driver, waId },
      conversationId: conversation.id,
      messageId: storedMessageId,
      messageType,
      bodyText,
      buttonId,
      replyToMessageId: message.context?.id ?? null,
    };
    if (!deferBot) processInbound(input).catch((err) => logger.error({ err }, `Bot failed for message ${storedMessageId}`));
  }

  await repo.touchConversation(conversation.id).catch(err => logger.error({ err }, 'Could not update conversation activity'));
  await runner.run("driver.recordWhatsappActivity", { driverId: driver.driver_id, waId }, { type: "SYSTEM", organizationId: driver.organization_id, source: "WHATSAPP" })
    .catch(err => logger.error({ err }, 'Could not update driver activity'));
  return input;
}

module.exports = { receiveMessage, extractContent };
