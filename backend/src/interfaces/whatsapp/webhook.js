/**
 * WhatsApp's door into the system. Checks that the call really comes from WhatsApp (a signature over the exact bytes), answers 200 straight
 * away so WhatsApp does not retry, and only then processes what it brought: delivery receipts and messages from drivers.
 */
const express = require("express");
const crypto = require("crypto");
const { logger } = require("../../platform/logger");
const config = require("../../platform/config");
const incoming = require("./incoming");
const repo = require("./repo");

const router = express.Router();

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.whatsappVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

function verifySignature(req) {
  const appSecret = config.whatsappAppSecret;
  // No secret configured means nobody can prove a request came from WhatsApp: reject it.
  if (!appSecret) return false;
  const signature = req.headers["x-hub-signature-256"];
  if (typeof signature !== "string" || !req.rawBody) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(req.rawBody).digest("hex");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  // timingSafeEqual throws on different lengths, so compare lengths first.
  return given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
}

const STATUS_MAP = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };

async function handleChange(value) {
  for (const status of value.statuses ?? []) {
    const mapped = STATUS_MAP[status.status];
    if (!mapped) continue;
    await repo.updateDeliveryStatus(status.id, mapped, status.timestamp);
  }

  for (const message of value.messages ?? []) {
    incoming.enqueue(message);
  }
}

router.post("/", (req, res) => {
  if (!verifySignature(req)) {
    return res.sendStatus(401);
  }
  res.sendStatus(200);

  for (const entry of req.body?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      handleChange(change.value).catch((err) =>
        logger.error({ err }, "Webhook processing error"),
      );
    }
  }
});

module.exports = { webhookRouter: router, verifySignature };
