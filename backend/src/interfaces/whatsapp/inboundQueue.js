/** Collect rapid text fragments before interpretation, while saving every original message immediately.
 * Preparation and bot turns are ordered per sender; unrelated drivers never block each other.
 */
function createInboundQueue({ prepare, process, delayMs = 4000, maxWaitMs = 12000, maxMessages = 20, maxCharacters = 8000,
  now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, onError = () => {} }) {
  const senders = new Map();
  let closed = false;
  const keyOf = message => String(message.from);
  const seal = group => {
    if (!group || group.ready) return;
    clearTimer(group.timer);
    group.ready = true;
  };
  async function pump(key, state) {
    if (state.running || !state.groups[0]?.ready) return;
    state.running = true;
    try {
      while (state.groups[0]?.ready) {
        const group = state.groups.shift();
        const received = await Promise.all(group.items.map(item => item.prepared));
        const inputs = received.filter(Boolean);
        // A conversation change or a different quoted message is a turn boundary, never a reason to combine contexts.
        for (const turn of combineInputs(inputs)) {
          try { await process(turn); }
          catch (err) { onError(err, 'Bot turn failed'); }
        }
        group.items.forEach(item => state.ids.delete(item.id));
      }
    } finally {
      state.running = false;
      if (!state.groups.length) senders.delete(key);
      else if (state.groups[0].ready) void pump(key, state);
    }
  }
  function enqueue(message) {
    if (closed) throw new Error('Inbound queue is shutting down');
    const key = keyOf(message);
    let state = senders.get(key);
    if (!state) {
      state = { groups: [], preparation: Promise.resolve(), ids: new Set(), running: false };
      senders.set(key, state);
    }
    if (state.ids.has(message.id)) return;
    state.ids.add(message.id);
    // Start persistence independently of the quiet timer. A slow database must not cause a reply to half a sentence.
    const prepared = state.preparation.then(() => prepare(message)).catch(err => { onError(err, 'Inbound message storage failed'); return null; });
    state.preparation = prepared;
    const item = { id: message.id, prepared };
    const quote = message.context?.id ?? null;
    let group = state.groups.at(-1);
    const text = message.type === 'text';
    const characters = String(message.text?.body ?? '').length;
    if (!text || !group || group.ready || group.quote !== quote || group.items.length >= maxMessages || group.characters + characters > maxCharacters) {
      seal(group);
      group = { items: [], quote, firstAt: now(), ready: !text, timer: null, characters: 0 };
      state.groups.push(group);
    }
    group.items.push(item);
    group.characters += characters;
    if (text) {
      clearTimer(group.timer);
      const remaining = Math.max(0, Math.min(delayMs, maxWaitMs - (now() - group.firstAt)));
      group.timer = setTimer(() => { seal(group); void pump(key, state); }, remaining);
    }
    void pump(key, state);
  }
  async function drain() {
    closed = true;
    for (const [key, state] of senders) { state.groups.forEach(seal); void pump(key, state); }
    // Existing processors may still be awaiting storage or a model response.
    while (senders.size) await new Promise(resolve => setTimeout(resolve, 10));
  }
  return { enqueue, drain };
}

function combineInputs(inputs) {
  const turns = [];
  for (const input of inputs) {
    const previous = turns.at(-1);
    const mayCombine = input.messageType === 'TEXT' && previous?.messageType === 'TEXT'
      && input.conversationId === previous.conversationId
      && (input.replyToMessageId ?? null) === (previous.replyToMessageId ?? null);
    if (mayCombine) {
      previous.bodyText = `${previous.bodyText.trim()} ${input.bodyText.trim()}`.trim();
      previous.messageId = input.messageId;
      previous.sourceMessageIds.push(input.messageId);
    } else turns.push({ ...input, sourceMessageIds: [input.messageId] });
  }
  return turns;
}

module.exports = { createInboundQueue, combineInputs };
