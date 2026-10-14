/**
 * Optional reactions to events. Each plugin exports { name, register({ subscribe, timers }) }. `config.plugins`
 * switches them on and off; the core process must work with every plugin off.
 */
const config = require('../platform/config');
const events = require('../platform/events');
const timers = require('../interfaces/timers');

const AVAILABLE = [require('./notifications'), require('./driverMatching'), require('./autoClosure'), require('./jobSummaries'), require('./delayReasons')];
const registered = new Set();

/** Register the enabled plugins' subscribers. Safe to call more than once. `only` overrides the config (tests). */
function registerPlugins({ only } = {}) {
  const wanted = only ?? config.plugins;
  for (const name of wanted) {
    if (!AVAILABLE.some((plugin) => plugin.name === name)) throw new Error(`Unknown plugin "${name}"`);
  }
  for (const plugin of AVAILABLE) {
    if (!wanted.includes(plugin.name) || registered.has(plugin.name)) continue;
    plugin.register({ subscribe: events.subscribe, timers });
    registered.add(plugin.name);
  }
}

module.exports = { registerPlugins, AVAILABLE, AVAILABLE_PLUGINS: AVAILABLE.map((plugin) => plugin.name) };
