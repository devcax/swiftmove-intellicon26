const config = require('../../platform/config');
const { logger } = require('../../platform/logger');
const { receiveMessage } = require('./receive');
const { processInbound } = require('./inbound');
const { createInboundQueue } = require('./inboundQueue');

const incoming = createInboundQueue({
  prepare: message => receiveMessage(message, { deferBot: true }),
  process: processInbound,
  delayMs: config.whatsappTextDebounceMs,
  maxWaitMs: config.whatsappTextMaxWaitMs,
  onError: (err, message) => logger.error({ err }, message),
});

module.exports = incoming;
