/**
 * Renders docs/capability-inventory.md from the registry: every action, query, check and event the system defines, and what each plugin
 * listens to. The page is generated, never edited by hand (a test fails when it is out of date).
 *
 * Usage: npm run docs:inventory
 */
const registry = require('../../src/platform/registry');
const { registerAllModules } = require('../../src/modules/register');
const plugins = require('../../src/plugins');

const cell = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const code = (text) => `\`${text}\``;
const byName = (a, b) => a.name.localeCompare(b.name);

function pluginSubscriptions() {
  const out = [];
  for (const plugin of plugins.AVAILABLE) {
    const listens = [];
    const timers = [];
    plugin.register({ subscribe: (event) => listens.push(event), timers: { add: (timer) => timers.push(timer.name) } });
    out.push({ name: plugin.name, listens: [...new Set(listens)], timers });
  }
  return out;
}

function render() {
  registerAllModules();
  const actions = registry.listActions().filter((a) => !a.target).sort(byName);
  const targets = registry.listActions().filter((a) => a.target).sort(byName);
  const queries = registry.listQueries().sort(byName);
  const checks = registry.listChecks().sort(byName);
  const events = registry.listEvents().sort(byName);
  const lines = [
    '# Capability inventory',
    '',
    'Generated from the registry by `npm run docs:inventory` (backend). Do not edit by hand: a test fails when this page is out of date.',
    'It lists everything the system can do (actions), read (queries), check in a policy (checks) and announce (events), and what each plugin reacts to.',
    '',
    `## Actions (${actions.length})`,
    '',
    'Every change to business data is one of these. Policies are written against these names. "Confirm" means the manager chat asks the manager first.',
    '',
    '| Action | What it does | Who | Roles | Confirm | Policy match fields |',
    '|---|---|---|---|---|---|',
    ...actions.map((a) => `| ${code(a.name)} | ${cell(`${a.title}. ${a.description}`)} | ${a.actors.join(', ')} | ${a.roles.join(', ') || 'any'} | ${a.destructive ? 'yes' : ''} | ${a.matchFields.join(', ')} |`),
    '',
    `## Settings targets (${targets.length})`,
    '',
    'Names that settings attach to. Nothing can run them.',
    '',
    '| Name | What it is |',
    '|---|---|',
    ...targets.map((t) => `| ${code(t.name)} | ${cell(t.description)} |`),
    '',
    `## Queries (${queries.length})`,
    '',
    'Reads. They change nothing and write no log row.',
    '',
    '| Query | What it returns | Who | Roles |',
    '|---|---|---|---|',
    ...queries.map((q) => `| ${code(q.name)} | ${cell(q.description)} | ${q.actors.join(', ')} | ${q.roles.join(', ') || 'any'} |`),
    '',
    `## Checks (${checks.length})`,
    '',
    'The building blocks of a policy. A check marked *unavailable* is declared so the AI author reports it honestly instead of faking it.',
    '',
    '| Check | What it requires | Used on | Status |',
    '|---|---|---|---|',
    ...checks.map((c) => `| ${code(c.name)} | ${cell(`${c.label}. ${c.description}`)} | ${c.actions === '*' ? 'any action' : c.actions.map(code).join(', ')} | ${c.available === false ? `unavailable: ${cell(c.unavailableReason)}` : 'available'} |`),
    '',
    `## Events (${events.length})`,
    '',
    'Saved in the same transaction as the change that caused them, then delivered to plugins at least once.',
    '',
    '| Event | When |',
    '|---|---|',
    ...events.map((e) => `| ${code(e.name)} | ${cell(e.description)} |`),
    '',
    '## Plugins',
    '',
    'Switched on and off with `PLUGINS`. The system completes the whole job lifecycle with every plugin off.',
    '',
    '| Plugin | Listens to | Timers |',
    '|---|---|---|',
    ...pluginSubscriptions().map((p) => `| ${code(p.name)} | ${p.listens.map(code).join(', ') || '—'} | ${p.timers.map(code).join(', ') || '—'} |`),
    '',
  ];
  return lines.join('\n');
}

module.exports = { render };
