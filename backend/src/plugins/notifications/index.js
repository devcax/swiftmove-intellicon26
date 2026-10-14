const { driverWelcome } = require('./driverWelcome');
const { activationLink } = require('./activationLink');
const { managerNotice, NOTICE_EVENTS } = require('./managerNotices');

/** Tells people about things that happened: an activation link for new drivers, a welcome once they verify, notices on the managers' dashboard. It only reacts to events, so it can be switched off. */
function register({ subscribe }) {
  subscribe('driver.activationRequested', 'notifications.activationLink', activationLink);
  subscribe('driver.verified', 'notifications.driverWelcome', driverWelcome);
  for (const type of NOTICE_EVENTS) subscribe(type, `notifications.managerNotice`, managerNotice);
}

module.exports = { name: 'notifications', register };
