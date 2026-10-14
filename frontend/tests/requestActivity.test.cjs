const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
};
const { reviewActivity } = require('../features/requests/activity.ts');
const now = new Date(2026, 0, 3, 12);
const entry = (year, month, day) => ({ decidedAt: new Date(year, month, day, 10).toISOString() });

test('weekly activity includes zero days and groups across the year boundary', () => {
  const data = reviewActivity([entry(2025, 11, 28), entry(2026, 0, 3), entry(2026, 0, 3), entry(2025, 11, 27)], 'week', now);
  assert.equal(data.length, 7);
  assert.deepEqual(data.map(item => item.value), [1, 0, 0, 0, 0, 0, 2]);
});
test('month and year views include only decisions inside their calendar buckets', () => {
  const entries = [entry(2025, 0, 31), entry(2025, 1, 1), entry(2026, 0, 1), { decidedAt: 'invalid' }];
  assert.equal(reviewActivity(entries, 'month', now).reduce((sum, item) => sum + item.value, 0), 1);
  const year = reviewActivity(entries, 'year', now);
  assert.equal(year.length, 12);
  assert.equal(year[0].value, 1);
  assert.equal(year[11].value, 1);
  assert.equal(year.reduce((sum, item) => sum + item.value, 0), 2);
});
