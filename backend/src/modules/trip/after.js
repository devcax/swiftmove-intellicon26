const notices = require('../../platform/driverNotices');

/** Send a driver a plain message once the change is saved. */
const notifyAfterCommit = (args) => () => notices.notify('notifyDriver', args);

module.exports = { notifyAfterCommit };
