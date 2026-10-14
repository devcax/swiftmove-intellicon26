const { driverWelcome } = require('./driverWelcome');
const { managerNotice, NOTICE_EVENTS } = require('./managerNotices');

/** Tells people about things that happened: a welcome to new drivers, notices on the managers' dashboard. It only reacts to events, so it can be switched off. */
function register({ subscribe }) {
  subscribe('driver.created', 'notifications.driverWelcome', driverWelcome);
  for (const type of NOTICE_EVENTS) subscribe(type, `notifications.managerNotice`, managerNotice);
}

module.exports = { name: 'notifications', register };
