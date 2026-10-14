/** The endpoint the dashboard reports a crashed screen to. Not a registry module; the app mounts its router. */
module.exports = { createClientErrorsRouter: require('./routes').createClientErrorsRouter };
