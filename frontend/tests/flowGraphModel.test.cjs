const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { flowPorts, setFlowPort, canConnect, insertFlowStep, deleteFlowStep, finishFlowBranches, pruneUnusedEnds } = require('../features/flows/graphModel.ts');

test('each branch keeps its own outlet even when two choices share a destination', () => {
  const step = { id: 'choose', type: 'ASK_CHOICE', options: [{ id: 'A', label: 'Yes', next: 'end' }, { id: 'B', label: 'No', next: 'end' }], onText: { intentMap: { CANCEL: 'end' }, elseNext: 'end' } };
  assert.equal(flowPorts(step).length, 4);
  const updated = setFlowPort(step, 'option:1', 'different');
  assert.equal(updated.options[0].next, 'end');
  assert.equal(updated.options[1].next, 'different');
  assert.equal(step.options[1].next, 'end');
  assert.equal(setFlowPort(step, 'intent:CANCEL', 'cancel').onText.intentMap.CANCEL, 'cancel');
});

test('inserted steps retain the previous downstream path and trigger insertion changes the entry', () => {
  const definition = { steps: [{ id: 'hello', type: 'SAY', text: 'Hello', next: 'end' }, { id: 'end', type: 'END' }] };
  const next = insertFlowStep(definition, { id: 'ask', type: 'ASK_TEXT', text: 'Why?' }, 'hello', 'next');
  assert.equal(next.steps[0].next, 'ask');
  assert.equal(next.steps[2].next, 'end');
  assert.equal(definition.steps[0].next, 'end');
  const entry = insertFlowStep(definition, { id: 'start', type: 'SAY' }, '__trigger', 'entry');
  assert.equal(entry.steps[0].id, 'start');
  assert.equal(entry.steps[0].next, 'hello');
});

test('connections reject cycles, self-links, missing steps, and invalid ports', () => {
  const definition = { steps: [{ id: 'a', type: 'SAY', next: 'b' }, { id: 'b', type: 'SAY', next: 'c' }, { id: 'c', type: 'END' }] };
  assert.equal(canConnect(definition, 'a', 'next', 'c'), true);
  assert.equal(canConnect(definition, 'b', 'next', 'a'), false);
  assert.equal(canConnect(definition, 'a', 'next', 'a'), false);
  assert.equal(canConnect(definition, 'a', 'next', 'missing'), false);
  assert.equal(canConnect(definition, 'c', 'next', 'a'), false);
});

test('deleting clears all incoming branch references without dropping unrelated data', () => {
  const definition = { steps: [{ id: 'branch', type: 'IF', then: 'removed', else: 'end' }, { id: 'ask', type: 'ASK_TEXT', classify: { categories: [{ id: 'YES', description: 'Agrees', next: 'removed' }], fallback: 'end' } }, { id: 'removed', type: 'END' }, { id: 'end', type: 'END' }] };
  const next = deleteFlowStep(definition, 'removed');
  assert.equal(next.steps.length, 3);
  assert.equal(next.steps[0].then, '');
  assert.equal(next.steps[0].else, 'end');
  assert.equal(next.steps[1].classify.categories[0].next, '');
  assert.equal(next.steps[1].classify.categories[0].description, 'Agrees');
});

test('classifier categories and fallbacks can reconnect independently', () => {
  const step = { id: 'ask', type: 'ASK_TEXT', classify: { categories: [{ id: 'YES', description: 'Agrees', next: 'yes' }], fallback: 'other' } };
  const updated = setFlowPort(setFlowPort(step, 'category:0', 'newYes'), 'fallback', 'newOther');
  assert.equal(updated.classify.categories[0].next, 'newYes');
  assert.equal(updated.classify.fallback, 'newOther');
});

test('new branches end explicitly without altering existing destinations', () => {
  const definition = { steps: [{ id: 'check', type: 'IF', then: 'original' }, { id: 'original', type: 'END' }] };
  const next = finishFlowBranches(definition, new Set(['check']));
  assert.equal(next.steps[0].then, 'original');
  assert.ok(next.steps.some((step) => step.id === next.steps[0].else && step.type === 'END'));
  assert.equal(finishFlowBranches(next).steps.length, next.steps.length);
  assert.equal(definition.steps[0].else, undefined);
  assert.deepEqual(flowPorts(next.steps.find((step) => step.id === next.steps[0].else)), []);
});

test('automatic ends respect the runtime step limit', () => {
  const definition = { steps: Array.from({ length: 99 }, (_, index) => ({ id: `end${index}`, type: 'END' })).concat({ id: 'check', type: 'IF' }) };
  assert.equal(finishFlowBranches(definition).steps.length, 100);
});

test('reconnected branches remove abandoned empty ends while preserving farewell text', () => {
  const next = pruneUnusedEnds({ steps: [{ id: 'start', type: 'SAY', next: 'used' }, { id: 'abandoned', type: 'END' }, { id: 'used', type: 'END' }, { id: 'farewell', type: 'END', text: 'Thank you' }] });
  assert.deepEqual(next.steps.map((step) => step.id), ['start', 'used', 'farewell']);
});

test('deleting an inserted starting action promotes its actual successor, not the next array item', () => {
  const definition = { steps: [{ id: 'action', type: 'ACTION', next: 'original' }, { id: 'other', type: 'END' }, { id: 'original', type: 'SAY', next: 'end' }, { id: 'end', type: 'END' }] };
  const next = deleteFlowStep(definition, 'action');
  assert.equal(next.steps[0].id, 'original');
  assert.equal(next.steps[0].next, 'end');
  assert.ok(!next.steps.some((step) => step.id === 'action'));
  assert.equal(definition.steps[0].id, 'action');
});

test('deleting a starting condition asks for a branch instead of guessing', () => {
  const definition = { steps: [{ id: 'condition', type: 'IF', then: 'yes', else: 'no' }, { id: 'yes', type: 'END', text: 'Yes' }, { id: 'no', type: 'END', text: 'No' }] };
  assert.equal(deleteFlowStep(definition, 'condition'), definition);
  assert.equal(deleteFlowStep(definition, 'condition', 'no').steps[0].id, 'no');
});

test('deleting the only action leaves a valid End node', () => {
  const next = deleteFlowStep({ steps: [{ id: 'action', type: 'ACTION' }] }, 'action');
  assert.equal(next.steps.length, 1);
  assert.equal(next.steps[0].type, 'END');
});

test('deleting a step in the middle joins its parent to the step after it', () => {
  const definition = { steps: [{ id: 'ask', type: 'ASK_TEXT', next: 'first' }, { id: 'first', type: 'ACTION', next: 'second' }, { id: 'second', type: 'ACTION', next: 'end' }, { id: 'end', type: 'END' }] };
  const next = deleteFlowStep(definition, 'second');
  assert.equal(next.steps.find((step) => step.id === 'first').next, 'end');
  assert.ok(next.steps.some((step) => step.id === 'end'));
  const choice = { steps: [{ id: 'q', type: 'ASK_CHOICE', options: [{ id: 'A', label: 'A', next: 'mid' }, { id: 'B', label: 'B', next: 'mid' }] }, { id: 'mid', type: 'SAY', next: 'end' }, { id: 'end', type: 'END' }] };
  assert.deepEqual(deleteFlowStep(choice, 'mid').steps[0].options.map((option) => option.next), ['end', 'end']);
});

test('deleting a step that splits waits for a chosen path, then joins the parent to it', () => {
  const definition = { steps: [{ id: 'hi', type: 'SAY', next: 'check' }, { id: 'check', type: 'IF', then: 'yes', else: 'no' }, { id: 'yes', type: 'END', text: 'Yes' }, { id: 'no', type: 'END', text: 'No' }] };
  assert.equal(deleteFlowStep(definition, 'check'), definition);
  const next = deleteFlowStep(definition, 'check', 'no');
  assert.equal(next.steps[0].next, 'no');
  assert.ok(next.steps.some((step) => step.id === 'yes'));
});
