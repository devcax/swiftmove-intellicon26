const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
};
const { incidentMetrics, filterIncidents } = require('../features/incidents/metrics.ts');
const incidents = [
  { severity: 'CRITICAL', status: 'OPEN' }, { severity: 'HIGH', status: 'UNDER_REVIEW' },
  { severity: 'HIGH', status: 'RESOLVED' }, { severity: 'LOW', status: 'RESOLVED' },
];
test('severity shares use all loaded incidents and handle an empty queue', () => {
  assert.deepEqual(incidentMetrics(incidents).map(item => [item.severity, item.count, item.percentage]), [
    ['CRITICAL', 1, 25], ['HIGH', 2, 50], ['MEDIUM', 0, 0], ['LOW', 1, 25],
  ]);
  assert.ok(incidentMetrics([]).every(item => item.count === 0 && item.percentage === 0));
});
test('status and severity filters combine without changing the metric source', () => {
  assert.equal(filterIncidents(incidents, 'OPEN,UNDER_REVIEW').length, 2);
  assert.deepEqual(filterIncidents(incidents, 'RESOLVED', 'HIGH'), [incidents[2]]);
  assert.equal(filterIncidents(incidents, '', '').length, 4);
  assert.equal(incidentMetrics(incidents).find(item => item.severity === 'HIGH').percentage, 50);
});
