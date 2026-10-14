/**
 * Every business module, in one list. A module is { name, actions, queries, checks, events, routes }.
 * The app registers them with the registry (`register.js`) and mounts their declared routes.
 */
module.exports = [require('./drivers'), require('./evidence'), require('./policies'), require('./flows'), require('./aiInstructions'), require('./jobs'), require('./requests'), require('./incidents'), require('./trip'), require('./notifications'), require('./conversations'), require('./stats'), require('./summaries')];
