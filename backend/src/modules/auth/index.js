/** Sign-in and sessions. Not a registry module (it has no actions); the app mounts its router and asks its repo for the session. */
module.exports = { createAuthRouter: require('./routes').createAuthRouter, repo: require('./repo') };
