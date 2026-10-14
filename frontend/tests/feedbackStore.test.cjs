const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
};
const { feedback, feedbackStore, dismissMessage, dismissToast } = require('../shared/feedback/store.ts');
test.beforeEach(() => {
  for (const item of feedbackStore.getSnapshot().toasts) dismissToast(item.id);
  for (const item of feedbackStore.getSnapshot().dialogs) dismissMessage(item.id);
});

test('action results stay in the shared store and dismissal affects only that toast', () => {
  const success = feedback.success('Driver saved');
  const failure = feedback.error('Job could not be saved');
  feedback.info('AI paused');
  feedback.warning('Missing evidence');
  assert.deepEqual(feedbackStore.getSnapshot().toasts.map(item => item.severity), ['success', 'error', 'info', 'warning']);
  assert.equal(feedbackStore.getSnapshot().toasts.find(item => item.id === failure).duration, 7000);
  dismissToast(success);
  assert.equal(feedbackStore.getSnapshot().toasts.length, 3);
  assert.ok(feedbackStore.getSnapshot().toasts.some(item => item.id === failure));
});

test('stack is bounded and subscribers receive immutable snapshots', () => {
  let changes = 0;
  const unsubscribe = feedbackStore.subscribe(() => changes++);
  const before = feedbackStore.getSnapshot();
  for (let index = 0; index < 6; index++) feedback.success(`Saved ${index}`);
  assert.equal(changes, 6);
  assert.equal(before.toasts.length, 0);
  assert.deepEqual(feedbackStore.getSnapshot().toasts.map(item => item.message), ['Saved 2', 'Saved 3', 'Saved 4', 'Saved 5']);
  unsubscribe();
  feedback.info('Another result');
  assert.equal(changes, 6);
});

test('queued confirmations resolve only their own decision, including cancellation', async () => {
  const first = feedback.confirm({ title: 'Delete job?', message: 'Cannot be undone' });
  const second = feedback.confirm({ title: 'Pause rule?', message: 'Applies immediately' });
  const [one, two] = feedbackStore.getSnapshot().dialogs;
  let secondResolved = false;
  void second.then(() => { secondResolved = true; });
  dismissMessage(one.id, true);
  assert.equal(await first, true);
  assert.equal(secondResolved, false);
  assert.equal(feedbackStore.getSnapshot().dialogs[0].id, two.id);
  dismissMessage(two.id);
  assert.equal(await second, false);
  dismissMessage(one.id, false); // A repeated click cannot change an already-resolved decision.
  assert.equal(feedbackStore.getSnapshot().dialogs.length, 0);
});

test('info and error messages use the same dialog queue without requiring confirmation', () => {
  feedback.message({ title: 'Information', message: 'Your changes remain a draft.' });
  feedback.message({ title: 'Action failed', message: 'Please retry.', severity: 'error' });
  const dialogs = feedbackStore.getSnapshot().dialogs;
  assert.equal(dialogs[0].severity, 'info');
  assert.equal(dialogs[1].severity, 'error');
  assert.ok(dialogs.every(item => item.confirmation === false));
});
