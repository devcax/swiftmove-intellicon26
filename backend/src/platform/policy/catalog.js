/**
 * The capabilities a policy can use: every check a module defines. The dashboard's policy builder and the AI author read this,
 * so a check added by a module shows up without a change here.
 */
const registry = require('../registry');

/** A registry check in the shape the catalog consumers expect. */
const toCapability = (check) => ({
  name: check.name, label: check.label, description: check.description, params: [...check.paramSpec],
  dataDependencies: [...check.dataDependencies], evidence: check.evidence ?? null, available: check.available,
  unavailableReason: check.unavailableReason,
});

const listCapabilities = () => registry.listChecks().map(toCapability);

const getCapability = (name) => listCapabilities().find((capability) => capability.name === name);

/** The actions a policy can gate: every action a module defines, and the names settings attach to. */
function listPolicyActions() {
  return registry.listActions().map((action) => (action.target
    ? { name: action.name, label: action.title, actor: action.actor, description: action.description, matchFields: [...action.matchFields] }
    : {
      name: action.name, label: action.title, actor: action.actors.length === 1 ? action.actors[0] : 'ANY',
      description: action.description, matchFields: [...action.matchFields],
    }));
}

/** The available checks that may be used on an action (those that list it, or every action). */
function checksUsableOn(actionName) {
  return registry.listChecks()
    .filter((check) => check.available !== false && (check.actions === '*' || check.actions.includes(actionName)))
    .map((check) => check.name);
}

module.exports = { listCapabilities, getCapability, listPolicyActions, checksUsableOn };
