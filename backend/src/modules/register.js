/**
 * Register every business module with the shared registry, once. The app does this at startup; scripts and tests that validate policies
 * (which are checked against the registered actions) call it too. Safe to call more than once.
 */
const registry = require('../platform/registry');
const modules = require('.');

let done = false;

function registerAllModules() {
  if (done) return modules;
  for (const mod of modules) {
    const alreadyThere = [...(mod.actions ?? []), ...(mod.queries ?? []), ...(mod.checks ?? [])]
      .some((definition) => registry.getAction(definition.name) || registry.getQuery(definition.name) || registry.getCheck(definition.name));
    if (!alreadyThere) registry.registerModule(mod);
  }
  registry.validateRegistry();
  done = true;
  return modules;
}

module.exports = { registerAllModules, modules };
