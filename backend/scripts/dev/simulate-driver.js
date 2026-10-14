/**
 * Driver simulator — posts fake Meta webhook payloads to the local backend so
 * the whole bot loop can be tested without a real WhatsApp device.
 *
 * Usage (server must be running, WHATSAPP_DRY_RUN=true recommended):
 *   node scripts/simulate-driver.js --phone 94778124590 --text "show jobs"
 *   node scripts/simulate-driver.js --phone 94778124590 --button ACCEPT_JOB --title Accept
 *   node scripts/simulate-driver.js --phone 94778124590 --button "CHOOSE_JOB:<uuid>" --title JOB-1042
 *   node scripts/simulate-driver.js --phone 94778124590 --audio "delayed 30 minutes, traffic"
 *   node scripts/simulate-driver.js --phone 94778124590 --image "signed POD" --filename pod.jpg
 *   node scripts/simulate-driver.js --phone 94778124590 --document --filename pod.pdf
 *
 * After posting, the script waits (--wait seconds, default 8) for the async
 * bot pipeline, then prints the latest messages of the driver's conversation.
 */
require('dotenv').config();
const { prisma } = require('../../src/platform/db');

const args = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = args[i + 1];
  // A flag followed by another flag (or nothing) counts as bare -> ''
  return v !== undefined && !v.startsWith('--') ? v : '';
}

const phone = (arg('phone') ?? '').replace(/\D/g, '');
const text = arg('text');
const buttonId = arg('button');
const buttonTitle = arg('title', buttonId);
const audioTranscript = arg('audio'); // simulated voice note (pre-filled transcript)
const imageCaption = arg('image');    // --image "caption" or bare --image
const documentCaption = arg('document');
const filename = arg('filename');
const waitSeconds = Number(arg('wait', '8'));
const baseUrl = arg('url', `http://localhost:${process.env.PORT || 4000}`);

if (!phone || (!text && !buttonId && audioTranscript === null && imageCaption === null && documentCaption === null)) {
  console.error('Usage: --phone <digits> (--text "msg" | --button <id> [--title t] | --audio "transcript" | --image [caption] | --document [caption]) [--filename f] [--wait 8]');
  process.exit(1);
}

function buildPayload() {
  const base = {
    from: phone,
    id: `wamid.sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  let message;
  if (buttonId) {
    message = { ...base, type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: buttonId, title: buttonTitle } } };
  } else if (audioTranscript !== null) {
    message = {
      ...base,
      type: 'audio',
      audio: { id: `sim-media-${Date.now()}`, mime_type: 'audio/ogg', transcript: audioTranscript || undefined },
    };
  } else if (imageCaption !== null) {
    message = {
      ...base,
      type: 'image',
      image: { id: `sim-media-${Date.now()}`, mime_type: 'image/jpeg', caption: imageCaption || undefined },
    };
  } else if (documentCaption !== null) {
    message = {
      ...base,
      type: 'document',
      document: { id: `sim-media-${Date.now()}`, mime_type: 'application/pdf', filename: filename ?? 'document.pdf', caption: documentCaption || undefined },
    };
  } else {
    message = { ...base, type: 'text', text: { body: text } };
  }
  return { entry: [{ changes: [{ field: 'messages', value: { messages: [message] } }] }] };
}

async function main() {
  const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload()),
  });
  console.log(`Webhook accepted: HTTP ${res.status}`);
  if (!res.ok) process.exit(1);

  console.log(`Waiting ${waitSeconds}s for the bot pipeline...`);
  await new Promise((r) => setTimeout(r, waitSeconds * 1000));

  const convo = await prisma.$queryRaw`
    SELECT c.id FROM conversations c
      JOIN driver_whatsapp_accounts wa ON wa.driver_id = c.driver_id
     WHERE regexp_replace(wa.phone_e164, '\\D', '', 'g') = ${phone} AND c.status = 'OPEN'
     ORDER BY c.last_message_at DESC NULLS LAST LIMIT 1`;
  if (convo.length === 0) {
    console.log('No conversation found for this number (is the driver registered?).');
    process.exit(1);
  }

  const messages = await prisma.$queryRaw`
    SELECT sender_type, message_type, body_text, delivery_status, created_at
      FROM messages WHERE conversation_id = ${convo[0].id}::uuid
     ORDER BY created_at DESC LIMIT 4`;
  console.log('\n--- Latest conversation messages (newest first) ---');
  for (const m of messages) {
    console.log(`[${m.created_at.toISOString()}] ${m.sender_type} (${m.delivery_status}):`);
    console.log(`  ${m.body_text}`);
  }

  const interp = await prisma.$queryRaw`
    SELECT ai.primary_intent, ai.confidence_score, ai.processing_status
      FROM ai_interpretations ai
      JOIN messages m ON m.id = ai.message_id
     WHERE m.conversation_id = ${convo[0].id}::uuid
     ORDER BY ai.created_at DESC LIMIT 1`;
  if (interp.length > 0) {
    const i = interp[0];
    console.log(`\nAI: intent=${i.primary_intent} confidence=${i.confidence_score} status=${i.processing_status}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Simulator failed:', err.message);
  process.exit(1);
});
