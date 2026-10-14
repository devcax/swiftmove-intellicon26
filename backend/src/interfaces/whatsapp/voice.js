/** A voice note: turned into text with the speech model once, and the text kept with the message. */
const { logger } = require("../../platform/logger");
const whatsapp = require("../../platform/whatsappClient");
const { transcribeAudio } = require("../../platform/llm");
const repo = require("./repo");

async function transcribeVoiceMessage(messageId) {
  const attachment = await repo.findAudioAttachment(messageId);
  if (!attachment) return null;

  let transcript = (attachment.transcriptionText ?? "").trim();
  if (!transcript) {
    try {
      const { buffer, mimeType } = await whatsapp.downloadMedia(
        attachment.storageKey,
      );
      const ext = (mimeType.split("/")[1] ?? "ogg").split(";")[0];
      const result = await transcribeAudio(buffer, `voice.${ext}`);
      transcript = (result.text ?? "").trim();
    } catch (err) {
      logger.error({ err }, "Voice transcription failed");
      return null;
    }
  }
  if (!transcript) return null;

  await repo.saveTranscript(attachment.id, transcript);
  await repo.setMessageText(messageId, ` ${transcript}`);
  return transcript;
}

module.exports = { transcribeVoiceMessage };
