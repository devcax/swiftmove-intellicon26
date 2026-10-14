const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
};
const { createMessageSync, acknowledgeMessage, reconcileMessages } = require('../features/conversations/messageSync.ts');
const local = { id: 'local-reply', kind: 'MANAGER', text: 'Hello', time: '09:47 PM', deliveryStatus: 'QUEUED' };
const saved = { ...local, id: 'server-reply', deliveryStatus: 'SENT' };

test('a poll begun before sending cannot remove the queued reply, even if it finishes after sending', () => {
  const sync = createMessageSync();
  const oldPoll = sync.beginRead('chat');
  assert.equal(sync.beginSend('chat'), true);
  assert.equal(sync.canApply('chat', oldPoll), false);
  assert.equal(sync.beginRead('chat'), null);
  sync.finishSend('chat');
  assert.equal(sync.canApply('chat', oldPoll), false);
  const freshPoll = sync.beginRead('chat');
  assert.equal(sync.canApply('chat', freshPoll), true);
});

test('slow network responses cannot overwrite a newer refresh', () => {
  const sync = createMessageSync();
  const first = sync.beginRead('chat');
  const second = sync.beginRead('chat');
  assert.equal(sync.canApply('chat', first), false);
  assert.equal(sync.canApply('chat', second), true);
});

test('sending in one chat does not block another; rapid double sends are rejected', () => {
  const sync = createMessageSync();
  assert.equal(sync.beginSend('chat-a'), true);
  assert.equal(sync.beginSend('chat-a'), false);
  const other = sync.beginRead('chat-b');
  assert.equal(sync.canApply('chat-b', other), true);
});

test('the send acknowledgement replaces the queued bubble with its stable render key', () => {
  const acknowledged = acknowledgeMessage([local], local.id, saved);
  assert.equal(acknowledged.length, 1);
  assert.equal(acknowledged[0].id, 'server-reply');
  assert.equal(acknowledged[0].clientId, 'local-reply');
  assert.equal(acknowledged[0].deliveryStatus, 'SENT');
  const polled = reconcileMessages(acknowledged, [{ ...saved, deliveryStatus: 'DELIVERED' }]);
  assert.equal(polled[0].clientId, 'local-reply');
  assert.equal(polled[0].deliveryStatus, 'DELIVERED');
});

test('an acknowledgement deduplicates the saved row without collapsing identical message text', () => {
  const earlier = { ...saved, id: 'earlier-reply' };
  const messages = acknowledgeMessage([earlier, local, saved], local.id, saved);
  assert.deepEqual(messages.map(message => message.id), ['earlier-reply', 'server-reply']);
});

test('failed unsaved replies remain visible after a refresh', () => {
  const failed = { ...local, deliveryStatus: 'FAILED' };
  assert.deepEqual(reconcileMessages([failed], []), [failed]);
  assert.equal(reconcileMessages([failed], [saved]).length, 2);
});

test('a stored delivery failure reconciles by id into one bubble', () => {
  const failed = { ...saved, clientId: local.id, deliveryStatus: 'FAILED' };
  const messages = reconcileMessages([failed], [{ ...saved, deliveryStatus: 'FAILED' }]);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].clientId, local.id);
});

test('clearing or deleting a chat invalidates its pending refresh', () => {
  const sync = createMessageSync();
  const poll = sync.beginRead('chat');
  sync.invalidate('chat');
  assert.equal(sync.canApply('chat', poll), false);
  assert.deepEqual(reconcileMessages([saved], []), []);
});
