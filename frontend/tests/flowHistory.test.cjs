const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { createHistory, commitHistory, undoHistory, redoHistory, canvasHistoryShortcut } = require('../features/flows/history.ts');

test('undo and redo restore both the conversation and node positions in order', () => {
  const initial = { working: { steps: ['start'] }, positions: { start: { x: 0, y: 0 } } };
  const added = { working: { steps: ['start', 'end'] }, positions: { start: { x: 0, y: 0 }, end: { x: 0, y: 300 } } };
  const dragged = { ...added, positions: { ...added.positions, end: { x: 400, y: 350 } } };
  const history = commitHistory(commitHistory(createHistory(initial), added), dragged);
  assert.deepEqual(undoHistory(history).present, added);
  assert.deepEqual(undoHistory(undoHistory(history)).present, initial);
  assert.deepEqual(redoHistory(undoHistory(history)).present, dragged);
});

test('continuous typing groups into one undo, while a pause or different operation starts another', () => {
  let history = createHistory('');
  history = commitHistory(history, 'H', 'message', 1000);
  history = commitHistory(history, 'Hi', 'message', 1200);
  assert.equal(history.past.length, 1);
  assert.equal(undoHistory(history).present, '');
  history = commitHistory(history, 'Hi there', 'message', 2000);
  assert.equal(history.past.length, 2);
  history = commitHistory(history, 'Another step', undefined, 2100);
  assert.equal(history.past.length, 3);
});

test('new work after undo discards the obsolete redo branch and no-op commits preserve it', () => {
  const undone = undoHistory(commitHistory(commitHistory(createHistory(0), 1), 2));
  assert.equal(commitHistory(undone, 1), undone);
  const replacement = commitHistory(undone, 3);
  assert.deepEqual(replacement.future, []);
  assert.equal(redoHistory(replacement), replacement);
});

test('history is bounded and cannot undo beyond its initial state', () => {
  const initial = createHistory(0);
  assert.equal(undoHistory(initial), initial);
  let history = initial;
  for (let index = 1; index <= 100; index += 1) history = commitHistory(history, index);
  assert.equal(history.past.length, 80);
});

test('canvas shortcuts support Ctrl and Command while preserving native input undo', () => {
  assert.equal(canvasHistoryShortcut('z', false, true, false), 'undo');
  assert.equal(canvasHistoryShortcut('Z', true, true, false), 'redo');
  assert.equal(canvasHistoryShortcut('y', false, true, false), 'redo');
  assert.equal(canvasHistoryShortcut('z', false, true, true), null);
  assert.equal(canvasHistoryShortcut('z', false, false, false), null);
});
