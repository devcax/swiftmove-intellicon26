const flowEngine = require('./runtime');

/** Run a flow against fake dependencies and return the transcript. Nothing leaves the process. */
async function runSimulation(row, inputs, startData = {}) {
  const transcript = [];
  let pending = null;
  const deps = {
    send: async ({ body, buttons = null, listRows = null }) => {
      transcript.push({
        from: 'bot', text: body,
        ...(buttons ? { buttons: buttons.map((b) => ({ id: b.id, title: b.title })) } : {}),
        ...(listRows ? { listRows: listRows.map((r) => ({ id: r.id, title: r.title })) } : {}),
      });
      return 'sim';
    },
    savePending: async (p) => { pending = p; },
    clearFlowPending: async () => { pending = null; },
    actions: new Proxy({}, { get: (_t, name) => async (_ctx, params) => { transcript.push({ from: 'system', action: String(name), params }); return {}; } }),
    promptProviders: new Proxy({}, {
      get: (_t, name) => async () => {
        transcript.push({ from: 'system', text: `[dynamic prompt: ${String(name)}]` });
        return { text: `[dynamic prompt: ${String(name)}]` };
      },
    }),
    classify: async (_text, categories) => categories[0]?.id ?? null,
  };

  const flow = { key: row.key, version: row.version, definition: row.definition };
  await flowEngine.startFlow(deps, flow, {}, { reason: null, jobReference: null, candidate: null, text: null, jobNumber: 'JOB-SIM-1', ...startData });

  for (const input of inputs) {
    if (!pending) {
      transcript.push({ from: 'system', text: 'Flow has already ended; input ignored.' });
      continue;
    }
    transcript.push({ from: 'driver', type: input.type ?? 'text', text: input.value ?? null });
    const engineInput = {};
    if (input.type === 'button') engineInput.buttonId = String(input.value ?? '');
    else if (input.type === 'location') engineInput.location = { lat: '6.9271', lng: '79.8612' };
    else if (input.type === 'photo') engineInput.photo = { messageId: 'sim' };
    else {
      engineInput.text = String(input.value ?? '');
      if (input.candidate) engineInput.candidate = input.candidate;
    }
    const outcome = await flowEngine.advanceFlow(deps, flow, pending, engineInput, {});
    if (!outcome.handled) transcript.push({ from: 'system', text: 'Input did not match the waiting step — the flow keeps waiting.' });
  }
  return { key: row.key, version: row.version, transcript, waitingAt: pending?.stepId ?? null };
}

module.exports = { runSimulation };
