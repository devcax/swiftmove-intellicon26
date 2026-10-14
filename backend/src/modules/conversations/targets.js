const { defineTarget } = require('../../platform/registry');

/** What settings about incoming messages attach to. Nothing runs under this name: the WhatsApp interface reads the settings. */
module.exports = [
  defineTarget({
    name: 'conversation.receive',
    title: 'Handle an incoming message',
    description: 'Any incoming WhatsApp message, before it is interpreted. Transport-level screening settings (for example prompt-injection sensitivity) attach to this.',
    actor: 'ANY',
  }),
];
