const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
};
const { pendingProofProgress } = require('../features/jobs/proofProgress.ts');
const job = { status: 'IN_PROGRESS', assignment: { id: 'current-assignment' }, pickupVerifiedAt: null, deliveryVerifiedAt: null };
const report = (milestone, extra = {}) => ({ type: 'MILESTONE_REPORTED', status: 'REVIEW_REQUIRED', time: '2026-10-14T12:00:00Z',
  data: { milestone, assignmentId: 'current-assignment' }, ...extra });

test('reported loading selects Loaded while the confirmed pointer remains Started', () => {
  const result = pendingProofProgress(job, [report('LOADED')], 2);
  assert.equal(result.index, 4);
  assert.equal(result.stage, 'PICKUP');
  assert.equal(job.status, 'IN_PROGRESS');
});
test('reported delivery selects the delivery step and waits for delivery proof', () => {
  const result = pendingProofProgress({ ...job, status: 'ARRIVED_AT_DELIVERY' }, [report('DELIVERED')], 6);
  assert.equal(result.index, 7);
  assert.equal(result.stage, 'DELIVERY');
});
test('proof verification or confirmed progress clears the pending outline', () => {
  assert.equal(pendingProofProgress({ ...job, pickupVerifiedAt: 'verified' }, [report('LOADED')], 2), null);
  assert.equal(pendingProofProgress(job, [report('LOADED')], 4), null);
  assert.equal(pendingProofProgress({ ...job, deliveryVerifiedAt: 'verified' }, [report('DELIVERED')], 6), null);
  assert.equal(pendingProofProgress(job, [report('DELIVERED')], 7), null);
});
test('reports from an old assignment, reset jobs, and rejected reports cannot move the pointer', () => {
  const old = report('LOADED', { data: { milestone: 'LOADED', assignmentId: 'old-assignment' } });
  assert.equal(pendingProofProgress(job, [old], 2), null);
  assert.equal(pendingProofProgress({ ...job, status: 'PUBLISHED' }, [report('LOADED')], 0), null);
  assert.equal(pendingProofProgress(job, [report('LOADED', { status: 'REJECTED' })], 2), null);
});
test('the furthest unverified reported milestone wins without confirming intervening steps', () => {
  assert.equal(pendingProofProgress(job, [report('DELIVERED'), report('LOADED')], 2).milestone, 'DELIVERED');
});
