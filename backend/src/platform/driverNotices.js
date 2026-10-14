/**
 * Telling a driver something after a change was saved ("the job was cancelled", "here is an offer"). The modules say what to tell; the
 * interface that reaches the driver (WhatsApp today) registers how, once at startup. A module never depends on the messaging code.
 */
const senders = {};

/** Register the senders: an object of name -> async ({ job, driver, ... }). */
const register = (implementations) => Object.assign(senders, implementations);

/** Send the named notice. Throws when nothing is registered for it, so a missing wire shows up in the logs instead of being skipped silently. */
function notify(name, args) {
  if (!senders[name]) throw new Error(`No sender is registered for the driver notice "${name}"`);
  return senders[name](args);
}

module.exports = { register, notify };
