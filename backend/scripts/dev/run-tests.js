/**
 * Test runner. Unit tests (no shared state) run together, in parallel. Integration tests share one
 * database and one organization, and the workflow notifies every manager of the organization, so a user
 * created by one file would be reached by another file's actions. They therefore run one file at a time.
 *
 * Usage: npm test              all tests
 *        npm test -- <file>    only the named test files (run alone)
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const preload = path.join(root, 'tests', 'helpers', 'setupEnv.js');

const filesIn = (dir) => {
  const full = path.join(root, dir);
  return fs.existsSync(full)
    ? fs.readdirSync(full).filter((name) => name.endsWith('.test.js')).sort().map((name) => path.join(dir, name))
    : [];
};

function runNode(files) {
  const started = Date.now();
  const run = spawnSync(process.execPath, ['--require', preload, '--test', ...files], {
    cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${run.stdout}\n${run.stderr}`;
  const count = (label) => Number((output.match(new RegExp(`^# ${label} (\\d+)`, 'm')) ?? [])[1] ?? 0);
  return {
    ok: run.status === 0, output, seconds: ((Date.now() - started) / 1000).toFixed(1),
    tests: count('tests'), pass: count('pass'), fail: count('fail'), cancelled: count('cancelled'), skipped: count('skipped'),
  };
}

const named = process.argv.slice(2);
const groups = named.length
  ? named.map((file) => [file])
  : [[...filesIn('tests'), ...filesIn(path.join('tests', 'unit'))], ...filesIn(path.join('tests', 'integration')).map((file) => [file])];

const total = { tests: 0, pass: 0, fail: 0, cancelled: 0, skipped: 0 };
let failed = false;
for (const files of groups) {
  const result = runNode(files);
  for (const key of Object.keys(total)) total[key] += result[key];
  failed = failed || !result.ok;
  const label = files.length === 1 ? files[0] : `${files.length} unit test files`;
  process.stdout.write(`${result.ok ? 'ok    ' : 'FAILED'} ${label}  (${result.pass}/${result.tests}, ${result.seconds}s)\n`);
  if (!result.ok) process.stdout.write(`${result.output}\n`);
}

process.stdout.write(`\n# tests ${total.tests}\n# pass ${total.pass}\n# fail ${total.fail}\n# cancelled ${total.cancelled}\n# skipped ${total.skipped}\n`);
process.exit(failed ? 1 : 0);
