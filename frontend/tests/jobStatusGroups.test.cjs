const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
};
const { matchesJobStatus } = require('../features/jobs/statusGroups.ts');
const { LIVE_STATUSES } = require('../../backend/src/platform/jobStateMachine');

test('Active Jobs counts every current backend live status, including started trips', () => {
  for (const status of LIVE_STATUSES) assert.equal(matchesJobStatus(status, 'ACTIVE'), true, status);
  assert.equal(matchesJobStatus('IN_PROGRESS', 'ACTIVE'), true);
  assert.equal(matchesJobStatus('ACTIVE', 'ACTIVE'), true);
});
test('draft, published, completed and cancelled jobs stay out of Active Jobs', () => {
  for (const status of ['DRAFT', 'PUBLISHED', 'DRIVER_REQUESTED', 'COMPLETED', 'CANCELLED']) {
    assert.equal(matchesJobStatus(status, 'ACTIVE'), false, status);
  }
});
test('the stat count and selected list agree for a mix of lifecycle statuses', () => {
  const statuses = ['IN_PROGRESS', 'LOADED', 'DEPARTED', 'INCIDENT_OPEN', 'MANAGER_REVIEW', 'PUBLISHED', 'COMPLETED', 'CANCELLED'];
  const active = statuses.filter(status => matchesJobStatus(status, 'ACTIVE'));
  assert.equal(active.length, 5);
  assert.deepEqual(active, statuses.slice(0, 5));
  assert.equal(statuses.filter(status => matchesJobStatus(status, 'ALL')).length, 8);
  assert.deepEqual(statuses.filter(status => matchesJobStatus(status, 'COMPLETED')), ['COMPLETED']);
  assert.deepEqual(statuses.filter(status => matchesJobStatus(status, 'PUBLISHED')), ['PUBLISHED']);
});
