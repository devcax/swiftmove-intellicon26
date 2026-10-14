/** The flow runtime: matching and running flow definitions. Pure; the WhatsApp interface and the dashboard simulator both use it. */
const match = require('./match');
const run = require('./run');

module.exports = { ...match, ...run };
