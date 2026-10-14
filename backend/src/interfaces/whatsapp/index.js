/**
 * The WhatsApp interface: the door drivers talk through. It receives their messages (webhook.js, receive.js), understands them
 * (inbound.js and what it uses) and answers; it tells drivers what happened after a change (notices.js, registered below so the modules
 * can ask for a notice without depending on this code). It holds no job rules: every change goes through the action runner as the driver.
 */
const driverNotices = require("../../platform/driverNotices");
const notices = require("./notices");
const { webhookRouter } = require("./webhook");

driverNotices.register(notices);

module.exports = { webhookRouter };
