const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { layoutFlow, placeNodes, arrangeFlow, roundedFlowPath, NODE_WIDTH, NODE_HEIGHT, ROW } = require('../features/flows/flowLayout.ts');

const byId = (layout) => Object.fromEntries(layout.nodes.map((node) => [node.id, node]));
const centre = (node) => node.x + node.width / 2;
const edge = (layout, id) => layout.edges.find((item) => item.id === id);

test('a straight conversation stacks in one column under the trigger', () => {
  const nodes = byId(layoutFlow({ steps: [{ id: 'hi', type: 'SAY', next: 'ask' }, { id: 'ask', type: 'ASK_TEXT', next: 'bye' }, { id: 'bye', type: 'END' }] }));
  assert.ok(nodes.__trigger.y < nodes.hi.y && nodes.hi.y < nodes.ask.y && nodes.ask.y < nodes.bye.y);
  assert.equal(centre(nodes.hi), centre(nodes.__trigger));
  assert.equal(centre(nodes.bye), centre(nodes.__trigger));
});

test('answers fan out in answer order beneath their question, which sits centred above them', () => {
  const layout = layoutFlow({ steps: [
    { id: 'choose', type: 'ASK_CHOICE', options: [{ id: 'A', label: 'One', next: 'a' }, { id: 'B', label: 'Two', next: 'b' }, { id: 'C', label: 'Three', next: 'c' }] },
    { id: 'c', type: 'END' }, { id: 'a', type: 'END' }, { id: 'b', type: 'END' },
  ] });
  const nodes = byId(layout);
  assert.ok(centre(nodes.a) < centre(nodes.b) && centre(nodes.b) < centre(nodes.c));
  assert.equal(nodes.a.y, nodes.c.y);
  assert.ok(nodes.a.y > nodes.choose.y);
  assert.ok(Math.abs(centre(nodes.choose) - centre(nodes.b)) < 1);
  assert.deepEqual(layout.edges.filter((item) => item.source === 'choose').map((item) => item.label), ['Button 1', 'Button 2', 'Button 3']);
  assert.deepEqual(layout.edges.find((item) => item.target === 'a').details, ['Button 1: One']);
});

test('Yes and No follow outlet order even when the saved array order differs', () => {
  const nodes = byId(layoutFlow({ steps: [{ id: 'condition', type: 'IF', then: 'yes', else: 'no' }, { id: 'no', type: 'END' }, { id: 'yes', type: 'SAY', next: 'finish' }, { id: 'finish', type: 'END' }] }));
  assert.equal(nodes.yes.y, nodes.no.y);
  assert.ok(centre(nodes.yes) < centre(nodes.no));
});

test('shared destinations sit below every parent, including a longer branch', () => {
  const nodes = byId(layoutFlow({ steps: [{ id: 'check', type: 'IF', then: 'action', else: 'ask' }, { id: 'action', type: 'ACTION', next: 'end' }, { id: 'ask', type: 'ASK_TEXT', next: 'action' }, { id: 'end', type: 'END' }] }));
  assert.ok(nodes.action.y > nodes.ask.y);
  assert.ok(nodes.end.y > nodes.action.y);
  assert.ok(nodes.ask.y > nodes.check.y);
});

test('no step overlaps another and no connector line runs through a step', () => {
  const layout = layoutFlow({ steps: [
    { id: 'q', type: 'ASK_CHOICE', options: [{ id: 'A', label: 'Late', next: 'late' }, { id: 'B', label: 'Fine', next: 'end' }, { id: 'C', label: 'Cancel', next: 'cancel' }] },
    { id: 'late', type: 'ASK_TEXT', next: 'log' }, { id: 'log', type: 'ACTION', next: 'end' }, { id: 'cancel', type: 'SAY', next: 'log' }, { id: 'end', type: 'END' },
  ] });
  const steps = layout.nodes;
  for (const a of steps) for (const b of steps) if (a.id < b.id) assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${a.id} overlaps ${b.id}`);
  for (const link of layout.edges) for (let index = 1; index < link.points.length; index += 1) {
    const a = link.points[index - 1], b = link.points[index];
    for (const node of steps) {
      if (node.id === link.source || node.id === link.target) continue;
      const inside = (x, y) => x > node.x && x < node.x + node.width && y > node.y && y < node.y + node.height;
      const samples = Array.from({ length: 21 }, (_, at) => ({ x: a.x + (b.x - a.x) * at / 20, y: a.y + (b.y - a.y) * at / 20 }));
      assert.ok(!samples.some((point) => inside(point.x, point.y)), `${link.id} crosses ${node.id}`);
    }
  }
});

test('a connector that skips rows keeps to its own lane beside the steps it passes', () => {
  const layout = layoutFlow({ steps: [{ id: 'a', type: 'IF', then: 'b', else: 'end' }, { id: 'b', type: 'SAY', next: 'c' }, { id: 'c', type: 'SAY', next: 'end' }, { id: 'end', type: 'END' }] });
  const nodes = byId(layout);
  const long = edge(layout, 'a:else');
  assert.ok(long.points.length > 4);
  assert.ok(nodes.end.y > nodes.c.y);
  for (let index = 1; index < long.points.length; index += 1) {
    const p = long.points[index - 1], q = long.points[index];
    if (p.x !== q.x) continue;
    for (const node of [nodes.b, nodes.c]) assert.ok(p.x < node.x || p.x > node.x + node.width || Math.max(p.y, q.y) <= node.y || Math.min(p.y, q.y) >= node.y + node.height, `lane runs through ${node.id}`);
  }
});

test('answers that lead to the same step share one connector with a combined label', () => {
  const layout = layoutFlow({ steps: [{ id: 'q', type: 'ASK_CHOICE', options: [{ id: 'A', label: 'Late', next: 'end' }, { id: 'B', label: 'Lost', next: 'end' }, { id: 'C', label: 'Fine', next: 'ok' }] }, { id: 'ok', type: 'SAY', next: 'end' }, { id: 'end', type: 'END' }] });
  const fromQ = layout.edges.filter((item) => item.source === 'q');
  assert.equal(fromQ.length, 2);
  assert.deepEqual(fromQ.find((item) => item.target === 'end').ports, ['option:0', 'option:1']);
  assert.equal(fromQ.find((item) => item.target === 'end').label, 'Buttons 1, 2');
  assert.deepEqual(fromQ.find((item) => item.target === 'end').details, ['Button 1: Late', 'Button 2: Lost']);
  const single = layoutFlow({ steps: [{ id: 'c', type: 'IF', then: 'end', else: 'end' }, { id: 'end', type: 'END' }] });
  assert.equal(single.edges.find((item) => item.source === 'c').label, undefined);
});

test('connectors from different steps into one step arrive side by side, each with its own add button', () => {
  const layout = layoutFlow({ steps: [{ id: 'q', type: 'IF', then: 'a', else: 'b' }, { id: 'a', type: 'SAY', next: 'end' }, { id: 'b', type: 'SAY', next: 'end' }, { id: 'end', type: 'END' }] });
  const into = layout.edges.filter((item) => item.target === 'end');
  assert.equal(new Set(into.map((item) => item.points[item.points.length - 1].x)).size, 2);
  assert.equal(new Set(into.map((item) => `${item.plusAt.x},${item.plusAt.y}`)).size, 2);
});

test('line labels stay short whatever the answers say', () => {
  const layout = layoutFlow({ steps: [
    { id: 'q', type: 'ASK_CHOICE', options: [{ id: 'A', label: 'Vehicle problem', next: 'x' }, { id: 'B', label: 'Accident on the road', next: 'x' }, { id: 'C', label: 'Customer issue', next: 'y' }], onText: { next: 'x', elseNext: 'y' } },
    { id: 'x', type: 'END' }, { id: 'y', type: 'END' },
  ] });
  const labels = Object.fromEntries(layout.edges.filter((item) => item.source === 'q').map((item) => [item.target, item.label]));
  assert.deepEqual(labels, { x: 'Buttons 1, 2, Typed', y: 'Button 3, Other text' });
  const many = layoutFlow({ steps: [{ id: 'c', type: 'ASK_TEXT', classify: { categories: [{ id: 'LATE', description: '', next: 'x' }, { id: 'LOST', description: '', next: 'x' }], fallback: 'x' }, next: 'y' }, { id: 'x', type: 'END' }, { id: 'y', type: 'END' }] });
  assert.equal(many.edges.find((item) => item.target === 'x').label, 'LATE +2');
  assert.equal(layoutFlow({ steps: [{ id: 'c', type: 'IF', then: 'x', else: 'y' }, { id: 'x', type: 'END' }, { id: 'y', type: 'END' }] }).edges.find((item) => item.target === 'y').label, 'No');
});

test('labels never sit on top of each other', () => {
  const layout = layoutFlow({ steps: [{ id: 'q', type: 'ASK_CHOICE', options: ['A', 'B', 'C', 'D', 'E'].map((id, at) => ({ id, label: `Answer number ${at}`, next: `s${at}` })) }, ...[0, 1, 2, 3, 4].map((at) => ({ id: `s${at}`, type: 'END' }))] });
  const labels = layout.edges.filter((item) => item.labelAt);
  assert.equal(labels.length, 5);
  for (const a of labels) for (const b of labels) if (a !== b) assert.ok(Math.abs(a.labelAt.x - b.labelAt.x) > 60 || Math.abs(a.labelAt.y - b.labelAt.y) >= 24);
});

test('zoomed-out layout keeps positions but drops labels and add buttons', () => {
  const definition = { steps: [{ id: 'c', type: 'IF', then: 'a', else: 'b' }, { id: 'a', type: 'END' }, { id: 'b', type: 'END' }] };
  const full = layoutFlow(definition), compact = layoutFlow(definition, { compact: true });
  assert.deepEqual(compact.nodes.map((node) => [node.x, node.y]), full.nodes.map((node) => [node.x, node.y]));
  assert.ok(compact.edges.every((item) => !item.labelAt && !item.plusAt));
});

test('open branches get an add placeholder and an empty conversation still offers a first step', () => {
  const layout = layoutFlow({ steps: [{ id: 'check', type: 'IF', then: 'end' }, { id: 'end', type: 'END' }] });
  const open = layout.nodes.filter((node) => node.kind === 'open');
  assert.deepEqual(open.map((node) => [node.source, node.port]), [['check', 'else']]);
  assert.equal(edge(layout, 'check:else').open, true);
  const empty = layoutFlow({ steps: [] });
  assert.deepEqual(empty.nodes.map((node) => node.kind).sort(), ['open', 'trigger']);
  assert.equal(empty.nodes.find((node) => node.kind === 'open').port, 'entry');
});

test('auto layout terminates for imported cycles and keeps disconnected steps visible', () => {
  const layout = layoutFlow({ steps: [{ id: 'a', type: 'SAY', next: 'b' }, { id: 'b', type: 'SAY', next: 'a' }, { id: 'orphan', type: 'END' }] });
  const nodes = byId(layout);
  assert.ok(['__trigger', 'a', 'b', 'orphan'].every((id) => nodes[id]));
  assert.equal(nodes.orphan.orphan, true);
  assert.ok(layout.edges.every((link) => !link.path.includes('NaN')));
});

test('steps keep a fixed card size so edges and cards always line up', () => {
  const nodes = layoutFlow({ steps: [{ id: 'a', type: 'END' }] }).nodes.filter((node) => node.kind !== 'open');
  assert.ok(nodes.every((node) => node.width === NODE_WIDTH && node.height === NODE_HEIGHT));
});

test('rounded paths handle straight lines and duplicate points without invalid coordinates', () => {
  const path = roundedFlowPath([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }]);
  assert.ok(path.includes(' Q '));
  assert.ok(!path.includes('NaN'));
  assert.ok(!path.includes('Infinity'));
});

const chain = { steps: [{ id: 'ask', type: 'ASK_CHOICE', options: [{ id: 'A', label: 'A', next: 'left' }, { id: 'B', label: 'B', next: 'right' }] }, { id: 'left', type: 'SAY', next: 'end' }, { id: 'right', type: 'SAY', next: 'end' }, { id: 'end', type: 'END' }] };
const boxesClear = (layout) => {
  for (const edge of layout.edges) for (let index = 1; index < edge.points.length; index += 1) {
    const a = edge.points[index - 1], b = edge.points[index];
    for (const node of layout.nodes) {
      if (node.id === edge.source || node.id === edge.target) continue;
      const hit = Math.max(a.x, b.x) > node.x && Math.min(a.x, b.x) < node.x + node.width && Math.max(a.y, b.y) > node.y && Math.min(a.y, b.y) < node.y + node.height;
      if (hit) return `${edge.id} crosses ${node.id}`;
    }
  }
  return null;
};

test('with nothing saved, cards sit exactly where the tidy layout puts them', () => {
  const auto = layoutFlow(chain);
  const placed = placeNodes(auto, {});
  for (const node of auto.nodes.filter((item) => item.kind !== 'open')) assert.deepEqual(placed[node.id], { x: node.x, y: node.y });
  assert.deepEqual(arrangeFlow(auto, placed).edges.map((edge) => edge.path), auto.edges.map((edge) => edge.path));
});

test('saved spots stay put when the conversation changes shape', () => {
  const saved = placeNodes(layoutFlow(chain), {});
  const changed = { steps: chain.steps.map((step) => step.id === 'ask' ? { ...step, options: [{ id: 'A', label: 'A', next: 'left' }, { id: 'B', label: 'B', next: 'left' }] } : step) };
  const placed = placeNodes(layoutFlow(changed), saved);
  for (const id of Object.keys(saved)) assert.deepEqual(placed[id], saved[id]);
});

test('a new step lands under the step that leads to it, without covering another card', () => {
  const saved = placeNodes(layoutFlow(chain), {});
  const added = { steps: [...chain.steps.map((step) => step.id === 'left' ? { ...step, next: 'extra' } : step), { id: 'extra', type: 'SAY', next: 'end' }] };
  const placed = placeNodes(layoutFlow(added), saved);
  assert.ok(placed.extra.y > placed.left.y);
  for (const [id, at] of Object.entries(placed)) if (id !== 'extra') assert.ok(Math.abs(at.x - placed.extra.x) >= NODE_WIDTH || Math.abs(at.y - placed.extra.y) >= NODE_HEIGHT, `extra covers ${id}`);
});

test('dragging a card re-routes its connectors around the other cards', () => {
  const auto = layoutFlow(chain);
  const placed = placeNodes(auto, {});
  // Drop "end" above "left" and "right", so its connectors must travel around them.
  const moved = { ...placed, end: { x: placed.ask.x, y: placed.left.y - ROW / 2 + 400 } };
  const arranged = arrangeFlow(auto, moved);
  assert.deepEqual(arranged.nodes.find((node) => node.id === 'end').y, moved.end.y);
  assert.equal(boxesClear(arranged), null);
  const dragged = arrangeFlow(auto, { ...placed, right: { x: placed.right.x + 500, y: placed.right.y + 300 } });
  assert.equal(boxesClear(dragged), null);
  assert.ok(dragged.edges.every((edge) => !edge.path.includes('NaN')));
  const above = arrangeFlow(auto, { ...placed, end: { x: placed.end.x + 700, y: placed.ask.y } });
  assert.equal(boxesClear(above), null);
});

test('while dragging, other connectors stay frozen and the moving ones change smoothly', () => {
  const auto = layoutFlow(chain);
  const placed = placeNodes(auto, {});
  const base = arrangeFlow(auto, placed);
  const live = { base, moving: new Set(['right']) };
  let previous = null;
  for (let step = 0; step <= 40; step += 1) {
    const at = { x: placed.right.x - 400 + step * 20, y: placed.right.y + step * 7 };
    const arranged = arrangeFlow(auto, { ...placed, right: at }, { live });
    for (const edge of arranged.edges) {
      if (edge.source !== 'right' && edge.target !== 'right') assert.equal(edge, base.edges.find((item) => item.id === edge.id));
      else assert.equal(edge.plusAt, undefined);
    }
    const into = arranged.edges.find((edge) => edge.target === 'right').points;
    if (previous) for (let index = 0; index < into.length; index += 1) assert.ok(Math.abs(into[index].x - previous[index].x) <= 20 && Math.abs(into[index].y - previous[index].y) <= 7);
    previous = into;
  }
});
