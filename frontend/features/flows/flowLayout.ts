import type { ApiFlowDefinition } from "./types";
import { flowPorts } from "./graphModel";

export interface Point { x: number; y: number }
export const TRIGGER_ID = "__trigger";
export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 72;
export const OPEN_SIZE = 40;
export const LAYER_GAP = 120;
/** One row of the tidy layout: a card plus the gap below it. */
export const ROW = NODE_HEIGHT + LAYER_GAP;
const COLUMN_GAP = 48;
const LANE_GAP = 24;
const JOG_BASE = 34;
const JOG_STEP = 14;
const JOG_LEVELS = 4;
const ARRIVAL_SPACING = 30;

const labelWidth = (label: string) => Math.min(140, label.length * 6.5 + 24);
const PORT_NAMES: Record<string, string> = { then: "Yes", else: "No", next: "Continue", textNext: "Typed", textElse: "Other text", fallback: "Other" };

/** A few words for the line itself; the full answer text is shown on hover. */
export function shortPortLabel(port: string, label: string): string {
  if (port.startsWith("option:")) return `Button ${Number(port.slice(7)) + 1}`;
  if (PORT_NAMES[port]) return PORT_NAMES[port];
  return label.length > 12 ? `${label.slice(0, 11)}…` : label;
}

function shortLinkLabel(ports: string[], labels: string[]): string {
  const buttons = ports.filter((port) => port.startsWith("option:")).map((port) => Number(port.slice(7)) + 1);
  const parts = [
    ...(buttons.length ? [`Button${buttons.length > 1 ? "s" : ""} ${buttons.join(", ")}`] : []),
    ...ports.flatMap((port, index) => port.startsWith("option:") ? [] : [shortPortLabel(port, labels[index])]),
  ];
  return parts.length > 2 ? `${parts[0]} +${parts.length - 1}` : parts.join(", ");
}

export const openNodeId = (source: string, port: string) => `__open:${source}:${port}`;

export interface LayoutNode { id: string; kind: "trigger" | "step" | "open"; x: number; y: number; width: number; height: number; source?: string; port?: string; orphan?: boolean }
export interface LayoutEdge {
  /** Every answer that follows this connector: answers sharing a destination share one line. */
  id: string; source: string; target: string; port: string; ports: string[]; open: boolean;
  /** Short text drawn on the line, and one full line per answer for the hover card. */
  label?: string; details: string[];
  path: string; points: Point[]; labelAt?: Point; plusAt?: Point;
}
export interface FlowLayout { nodes: LayoutNode[]; edges: LayoutEdge[] }
export type Positions = Record<string, Point>;

interface Vertex { id: string; width: number; height: number; dummy: boolean; layer: number; x: number }
interface Link { id: string; source: string; target: string; port: string; ports: string[]; labels: string[]; label?: string; open: boolean; back: boolean; chain: Vertex[] }

/** Smooth orthogonal corners keep a connector easy to follow with the eye. */
export function roundedFlowPath(points: Point[], radius = 12): string {
  const compact = points.filter((point, index) => !index || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
  if (!compact.length) return "";
  let path = `M ${compact[0].x} ${compact[0].y}`;
  for (let index = 1; index < compact.length - 1; index += 1) {
    const a = compact[index - 1], b = compact[index], c = compact[index + 1];
    const before = Math.hypot(b.x - a.x, b.y - a.y), after = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(radius, before / 2, after / 2);
    const p = { x: b.x + (a.x - b.x) * r / before, y: b.y + (a.y - b.y) * r / before };
    const q = { x: b.x + (c.x - b.x) * r / after, y: b.y + (c.y - b.y) * r / after };
    path += ` L ${p.x} ${p.y} Q ${b.x} ${b.y} ${q.x} ${q.y}`;
  }
  const end = compact[compact.length - 1];
  return `${path} L ${end.x} ${end.y}`;
}

function portDetails(ports: string[], labels: string[], label: string | undefined): string[] {
  if (!label) return [];
  return ports.map((port, index) => {
    const short = shortPortLabel(port, labels[index]);
    return short === labels[index] ? short : `${short}: ${labels[index]}`;
  });
}

type EdgeInfo = Omit<LayoutEdge, "path" | "points" | "labelAt" | "plusAt">;

/** Turns a route into a drawn connector: its path, where the label rides and where its "+" sits. */
function finishEdge(edge: EdgeInfo, points: Point[], sharedTarget: boolean, compact: boolean): LayoutEdge {
  const start = points[0], turn = points[1], next = points[2];
  const run = next.x - start.x;
  const down = (points[3]?.y ?? next.y) >= next.y ? 1 : -1;
  // A label rides on the sideways run when there is room, otherwise on its own branch just past the split.
  const labelAt = edge.label && !compact ? (Math.abs(run) >= labelWidth(edge.label) + 24 ? { x: start.x + run / 2, y: turn.y } : { x: next.x, y: turn.y + 22 * down }) : undefined;
  const before = points[points.length - 2], after = points[points.length - 1];
  const middle = sharedTarget ? after.y - 30 : (before.y + after.y) / 2;
  const belowLabel = labelAt && labelAt.x === after.x && labelAt.y >= before.y ? labelAt.y + 34 : -Infinity;
  const plusAt = edge.open || compact ? undefined : { x: after.x, y: Math.min(after.y - 22, Math.max(middle, belowLabel)) };
  return { ...edge, path: roundedFlowPath(points), points, labelAt, plusAt };
}

/** Nudge any label that would sit on top of another one further along its line. */
function spreadLabels(edges: LayoutEdge[]): LayoutEdge[] {
  const placed: { x: number; y: number; width: number }[] = [];
  return edges.map((edge) => {
    if (!edge.labelAt || !edge.label) return edge;
    const width = labelWidth(edge.label), at = { ...edge.labelAt };
    while (placed.some((other) => Math.abs(other.x - at.x) < (other.width + width) / 2 + 6 && Math.abs(other.y - at.y) < 24)) at.y += 26;
    placed.push({ ...at, width });
    return at.y === edge.labelAt.y ? edge : { ...edge, labelAt: at };
  });
}

/** Closest non-decreasing fit (pool adjacent violators), so neighbours keep their order and spacing while sitting near where they want to be. */
function place(layer: Vertex[], desired: number[]) {
  const offsets = layer.map(() => 0);
  for (let index = 1; index < layer.length; index += 1) {
    const a = layer[index - 1], b = layer[index];
    offsets[index] = offsets[index - 1] + (a.width + b.width) / 2 + (a.dummy || b.dummy ? LANE_GAP : COLUMN_GAP);
  }
  const blocks: { sum: number; count: number; start: number }[] = [];
  layer.forEach((_, index) => {
    blocks.push({ sum: desired[index] - offsets[index], count: 1, start: index });
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1], before = blocks[blocks.length - 2];
      if (before.sum / before.count <= last.sum / last.count) break;
      blocks.splice(blocks.length - 2, 2, { sum: before.sum + last.sum, count: before.count + last.count, start: before.start });
    }
  });
  for (const block of blocks) for (let index = block.start; index < block.start + block.count; index += 1) layer[index].x = block.sum / block.count + offsets[index];
}

/**
 * Lays the conversation out top to bottom: every step sits one row below the step before it,
 * a step with several answers fans out beneath itself, and parents are centred above their children.
 * Connectors that skip rows get their own lane so they never cross a step.
 */
export function layoutFlow(definition: ApiFlowDefinition, { compact = false }: { compact?: boolean } = {}): FlowLayout {
  const known = new Set(definition.steps.map((step) => step.id));
  const boxes = new Map<string, Pick<LayoutNode, "kind" | "width" | "height" | "source" | "port">>([[TRIGGER_ID, { kind: "trigger", width: NODE_WIDTH, height: NODE_HEIGHT }]]);
  for (const step of definition.steps) boxes.set(step.id, { kind: "step", width: NODE_WIDTH, height: NODE_HEIGHT });
  const links: Link[] = [];
  const connect = (source: string, port: string, target: string | undefined, label = "") => {
    const open = !target || !known.has(target);
    const to = open ? openNodeId(source, port) : target;
    const shared = links.find((link) => !open && link.source === source && link.target === to);
    if (shared) { shared.ports.push(port); shared.labels.push(label); return; }
    if (open) boxes.set(to, { kind: "open", width: OPEN_SIZE, height: OPEN_SIZE, source, port });
    links.push({ id: source === TRIGGER_ID ? "trigger-edge" : `${source}:${port}`, source, target: to, port, ports: [port], labels: [label], open, back: false, chain: [] });
  };
  connect(TRIGGER_ID, "entry", definition.steps[0]?.id);
  for (const step of definition.steps) {
    const first = links.length;
    for (const port of flowPorts(step)) connect(step.id, port.id, port.target, port.label);
    // A label only helps when the step actually splits into more than one line.
    if (links.length - first > 1) for (const link of links.slice(first)) link.label = shortLinkLabel(link.ports, link.labels);
  }

  // Layers: longest path from the roots. Links that would close a loop are drawn but never push a step upward.
  const out = new Map<string, Link[]>([...boxes.keys()].map((id) => [id, []]));
  for (const link of links) out.get(link.source)!.push(link);
  const state = new Map<string, 1 | 2>();
  const finished: string[] = [];
  const visit = (id: string) => {
    state.set(id, 1);
    for (const link of out.get(id)!) {
      if (state.get(link.target) === 1) link.back = true;
      else if (!state.has(link.target)) visit(link.target);
    }
    state.set(id, 2);
    finished.push(id);
  };
  for (const id of boxes.keys()) if (!state.has(id)) visit(id);
  const layerOf = new Map([...boxes.keys()].map((id) => [id, 0]));
  for (const id of [...finished].reverse()) for (const link of out.get(id)!) if (!link.back) layerOf.set(link.target, Math.max(layerOf.get(link.target)!, layerOf.get(id)! + 1));

  const vertices = new Map<string, Vertex>();
  for (const [id, box] of boxes) vertices.set(id, { id, width: box.width, height: box.height, dummy: false, layer: layerOf.get(id)!, x: 0 });
  const down = new Map<Vertex, Vertex[]>(), up = new Map<Vertex, Vertex[]>();
  const all: Vertex[] = [...vertices.values()];
  for (const vertex of all) { down.set(vertex, []); up.set(vertex, []); }
  const join = (a: Vertex, b: Vertex) => { down.get(a)!.push(b); up.get(b)!.push(a); };
  for (const link of links) {
    if (link.back) continue;
    const from = vertices.get(link.source)!, to = vertices.get(link.target)!;
    let previous = from;
    for (let row = from.layer + 1; row < to.layer; row += 1) {
      const lane: Vertex = { id: `${link.id}#${row}`, width: 0, height: 0, dummy: true, layer: row, x: 0 };
      link.chain.push(lane); all.push(lane); down.set(lane, []); up.set(lane, []);
      join(previous, lane); previous = lane;
    }
    join(previous, to);
  }

  // Order within each row: follow the answer order first, then untangle crossings.
  const rank = new Map<Vertex, number>();
  const walk = (vertex: Vertex) => {
    if (rank.has(vertex)) return;
    rank.set(vertex, rank.size);
    for (const next of down.get(vertex)!) walk(next);
  };
  for (const vertex of all) if (!up.get(vertex)!.length) walk(vertex);
  const rows: Vertex[][] = [];
  for (const vertex of all) (rows[vertex.layer] ??= []).push(vertex);
  for (const row of rows) row.sort((a, b) => rank.get(a)! - rank.get(b)!);
  const crossings = () => {
    let total = 0;
    for (let index = 0; index + 1 < rows.length; index += 1) {
      const lower = new Map(rows[index + 1].map((vertex, at) => [vertex, at]));
      const pairs = rows[index].flatMap((vertex, at) => down.get(vertex)!.map((next) => [at, lower.get(next)!] as const));
      for (let a = 0; a < pairs.length; a += 1) for (let b = a + 1; b < pairs.length; b += 1) if ((pairs[a][0] - pairs[b][0]) * (pairs[a][1] - pairs[b][1]) < 0) total += 1;
    }
    return total;
  };
  // Answers must stay in the order the manager wrote them, so a reordering that swaps siblings is never kept.
  const keepsAnswerOrder = () => {
    const at = new Map(rows.flatMap((row) => row.map((vertex, index) => [vertex, index] as const)));
    return [...down].every(([, kids]) => kids.every((kid, index) => index === 0 || at.get(kids[index - 1])! <= at.get(kid)!));
  };
  let best = rows.map((row) => [...row]), bestCrossings = crossings();
  const reorder = (row: Vertex[], neighbours: Map<Vertex, Vertex[]>, adjacent: Vertex[]) => {
    const at = new Map(adjacent.map((vertex, index) => [vertex, index]));
    const score = (vertex: Vertex, index: number) => {
      const near = neighbours.get(vertex)!.map((item) => at.get(item)!);
      return near.length ? near.reduce((sum, value) => sum + value, 0) / near.length : index;
    };
    const scored = row.map((vertex, index) => ({ vertex, index, value: score(vertex, index) }));
    scored.sort((a, b) => a.value - b.value || a.index - b.index);
    row.splice(0, row.length, ...scored.map((item) => item.vertex));
  };
  for (let round = 0; round < 4 && bestCrossings > 0; round += 1) {
    for (let index = 1; index < rows.length; index += 1) reorder(rows[index], up, rows[index - 1]);
    for (let index = rows.length - 2; index >= 0; index -= 1) reorder(rows[index], down, rows[index + 1]);
    const total = crossings();
    if (total < bestCrossings && keepsAnswerOrder()) { best = rows.map((row) => [...row]); bestCrossings = total; }
  }
  best.forEach((row, index) => { rows[index] = row; });

  // Horizontal placement: pack, then pull children under parents and parents over children a few times.
  for (const row of rows) place(row, row.map(() => 0));
  const pull = (row: Vertex[], neighbours: Map<Vertex, Vertex[]>) => place(row, row.map((vertex) => {
    const near = neighbours.get(vertex)!;
    return near.length ? near.reduce((sum, item) => sum + item.x, 0) / near.length : vertex.x;
  }));
  for (let round = 0; round < 8; round += 1) {
    for (let index = 1; index < rows.length; index += 1) pull(rows[index], up);
    for (let index = rows.length - 2; index >= 0; index -= 1) pull(rows[index], down);
  }
  const left = Math.min(...all.map((vertex) => vertex.x - vertex.width / 2));
  for (const vertex of all) vertex.x -= left;
  const rowY = (layer: number) => layer * (NODE_HEIGHT + LAYER_GAP);

  // Where each connector arrives: several links into one step fan out along its top edge.
  const arrivals = new Map<string, number>();
  const incoming = new Map<string, Link[]>();
  for (const link of links) if (!link.open) incoming.set(link.target, [...(incoming.get(link.target) ?? []), link]);
  const lastX = (link: Link) => (link.chain.length ? link.chain[link.chain.length - 1] : vertices.get(link.source)!).x;
  for (const [target, group] of incoming) {
    const spacing = compact ? 0 : Math.min(ARRIVAL_SPACING, (NODE_WIDTH - 80) / Math.max(1, group.length - 1));
    [...group].sort((a, b) => lastX(a) - lastX(b)).forEach((link, index) => arrivals.set(link.id, vertices.get(target)!.x + (index - (group.length - 1) / 2) * spacing));
  }

  // Connectors leaving different steps on the same row get their own height, so side-by-side lines never run along each other.
  const jogLevel = new Map<string, number>();
  const sources = new Map<string, Link[]>();
  for (const link of links) if (!link.back) sources.set(link.source, [...(sources.get(link.source) ?? []), link]);
  const reach = (link: Link) => (link.chain[0] ?? { x: arrivals.get(link.id) ?? vertices.get(link.target)!.x }).x;
  const spans = [...sources].map(([id, group]) => {
    const x = vertices.get(id)!.x, ends = group.map(reach);
    return { id, layer: vertices.get(id)!.layer, left: Math.min(x, ...ends), right: Math.max(x, ...ends) };
  }).filter((span) => span.right > span.left).sort((a, b) => a.layer - b.layer || a.left - b.left);
  const taken = new Map<number, number[]>();
  for (const span of spans) {
    const rights = taken.get(span.layer) ?? [];
    let level = rights.findIndex((right) => right + 12 < span.left);
    if (level < 0) level = rights.length;
    rights[level] = span.right;
    taken.set(span.layer, rights);
    jogLevel.set(span.id, Math.min(level, JOG_LEVELS - 1));
  }

  const edges: LayoutEdge[] = links.map((link) => {
    const from = vertices.get(link.source)!, to = vertices.get(link.target)!;
    const bottom = rowY(from.layer) + from.height, top = rowY(to.layer);
    const arrive = arrivals.get(link.id) ?? to.x;
    const jog = bottom + JOG_BASE + (jogLevel.get(link.source) ?? 0) * JOG_STEP;
    const points: Point[] = [{ x: from.x, y: bottom }];
    if (link.back) {
      const gutter = -60;
      points.push({ x: from.x, y: jog }, { x: gutter, y: jog }, { x: gutter, y: top - LAYER_GAP * 0.45 }, { x: arrive, y: top - LAYER_GAP * 0.45 }, { x: arrive, y: top });
    } else if (!link.chain.length) {
      points.push({ x: from.x, y: jog }, { x: arrive, y: jog }, { x: arrive, y: top });
    } else {
      let x = link.chain[0].x;
      points.push({ x: from.x, y: jog }, { x, y: jog });
      for (const lane of link.chain.slice(1)) {
        const y = rowY(lane.layer) - LAYER_GAP / 2;
        points.push({ x, y }, { x: lane.x, y });
        x = lane.x;
      }
      const final = top - LAYER_GAP * 0.45;
      points.push({ x, y: final }, { x: arrive, y: final }, { x: arrive, y: top });
    }
    const shared = (incoming.get(link.target)?.length ?? 0) > 1;
    return finishEdge({ id: link.id, source: link.source, target: link.target, port: link.port, ports: link.ports, label: link.label, details: portDetails(link.ports, link.labels, link.label), open: link.open }, points, shared, compact);
  });

  const hasParent = new Set(links.filter((link) => !link.back).map((link) => link.target));
  const nodes: LayoutNode[] = [...boxes].map(([id, box]) => {
    const vertex = vertices.get(id)!;
    return { id, ...box, x: vertex.x - vertex.width / 2, y: rowY(vertex.layer), orphan: box.kind === "step" && !hasParent.has(id) };
  });
  return { nodes, edges: spreadLabels(edges) };
}

interface Box { x: number; y: number; width: number; height: number }

/** True when no segment of the route passes through a card (with a little breathing room around it). */
function routeIsClear(points: Point[], boxes: Box[], margin = 8): boolean {
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1], b = points[index];
    const left = Math.min(a.x, b.x), right = Math.max(a.x, b.x), top = Math.min(a.y, b.y), bottom = Math.max(a.y, b.y);
    for (const box of boxes) if (right > box.x - margin && left < box.x + box.width + margin && bottom > box.y - margin && top < box.y + box.height + margin) return false;
  }
  return true;
}

const routeCost = (points: Point[]) => points.slice(1).reduce((sum, point, index) => sum + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0) + points.length * 40;

/**
 * Connector between two cards the manager placed by hand: down, across, down when the target is below,
 * otherwise around the side. Prefers the shortest route that touches no other card.
 */
function freeRoute(start: Point, end: Point, from: Box, to: Box, others: Box[]): Point[] {
  const below = end.y - start.y >= JOG_BASE + 34;
  const firstTurn = start.y + JOG_BASE, lastTurn = end.y - JOG_BASE - 6;
  const simple: Point[][] = [];
  if (below) {
    const rows = new Set([firstTurn, lastTurn]);
    for (const box of others) for (const y of [box.y - 24, box.y + box.height + 24]) if (y > start.y + 16 && y < end.y - 16) rows.add(y);
    for (const y of rows) simple.push([start, { x: start.x, y }, { x: end.x, y }, end]);
  }
  simple.sort((a, b) => routeCost(a) - routeCost(b));
  const direct = simple.find((points) => routeIsClear(points, others));
  if (direct) return direct;
  // Detour down a channel beside whichever cards are in the way.
  const channels = new Set([from.x - 32, from.x + from.width + 32, to.x - 32, to.x + to.width + 32]);
  const low = Math.min(start.y, end.y) - ROW, high = Math.max(start.y, end.y) + ROW;
  for (const box of others) if (box.y + box.height > low && box.y < high) { channels.add(box.x - 28); channels.add(box.x + box.width + 28); }
  const detours = [...channels].map((x) => [start, { x: start.x, y: firstTurn }, { x, y: firstTurn }, { x, y: lastTurn }, { x: end.x, y: lastTurn }, end]);
  const all = [...simple, ...detours].sort((a, b) => routeCost(a) - routeCost(b));
  return all.find((points) => routeIsClear(points, others)) ?? all[0];
}

/** A drag in progress: the layout when it started and the cards being moved. */
export interface LiveDrag { base: FlowLayout; moving: ReadonlySet<string> }

/**
 * While a card is being dragged its connectors follow a simple shape that changes smoothly with the pointer;
 * every other connector stays exactly as it was. The careful route around the cards is worked out on drop.
 */
function liveEdge(edge: LayoutEdge, live: LiveDrag, byId: Map<string, LayoutNode>): LayoutEdge {
  const before = live.base.edges.find((item) => item.id === edge.id);
  if (before && !live.moving.has(edge.source) && !live.moving.has(edge.target)) return before;
  const from = byId.get(edge.source)!, to = byId.get(edge.target)!;
  const target = live.base.nodes.find((node) => node.id === edge.target);
  const offset = before && target ? before.points[before.points.length - 1].x - (target.x + target.width / 2) : 0;
  const start = { x: from.x + from.width / 2, y: from.y + from.height }, end = { x: to.x + to.width / 2 + offset, y: to.y };
  const turn = start.y + JOG_BASE;
  const points = end.y - start.y >= JOG_BASE * 2
    ? [start, { x: start.x, y: turn }, { x: end.x, y: turn }, end]
    : (() => {
      const side = Math.max(from.x + from.width, to.x + to.width) + 40, back = end.y - JOG_BASE;
      return [start, { x: start.x, y: turn }, { x: side, y: turn }, { x: side, y: back }, { x: end.x, y: back }, end];
    })();
  return finishEdge(edge, points, false, true);
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width + 16 && b.x < a.x + a.width + 16 && a.y < b.y + b.height + 16 && b.y < a.y + a.height + 16;

/**
 * Where every card sits: a saved spot when it has one, otherwise under the step that leads to it,
 * keeping the tidy layout's spacing, and moved aside if that spot is already taken.
 */
export function placeNodes(auto: FlowLayout, saved: Positions): Positions {
  const placed: Positions = {};
  const tidy = new Map(auto.nodes.map((node) => [node.id, node]));
  const cards = auto.nodes.filter((node) => node.kind !== "open");
  for (const node of cards) if (saved[node.id]) placed[node.id] = saved[node.id];
  for (const node of [...cards].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (placed[node.id]) continue;
    const parent = auto.edges.find((edge) => edge.target === node.id && placed[edge.source]);
    const anchor = parent ? tidy.get(parent.source)! : undefined;
    let at = parent && anchor ? { x: placed[parent.source].x + node.x - anchor.x, y: placed[parent.source].y + node.y - anchor.y } : { x: node.x, y: node.y };
    const taken = cards.filter((other) => placed[other.id]).map((other) => ({ ...other, ...placed[other.id] }));
    while (taken.some((other) => overlaps(other, { ...node, ...at }))) at = { x: at.x + NODE_WIDTH + COLUMN_GAP, y: at.y };
    placed[node.id] = at;
  }
  return placed;
}

/**
 * The flow as the manager arranged it. Connectors whose ends sit where the tidy layout put them keep
 * the tidy route; the rest are re-routed around the cards.
 */
export function arrangeFlow(auto: FlowLayout, positions: Positions, { compact = false, live }: { compact?: boolean; live?: LiveDrag } = {}): FlowLayout {
  const tidy = new Map(auto.nodes.map((node) => [node.id, node]));
  const nodes = auto.nodes.map((node) => {
    if (node.kind !== "open") return { ...node, ...(positions[node.id] ?? {}) };
    const owner = tidy.get(node.source!)!, at = positions[node.source!] ?? owner;
    return { ...node, x: at.x + node.x - owner.x, y: at.y + node.y - owner.y };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (live) return { nodes, edges: auto.edges.map((edge) => liveEdge(edge, live, byId)) };
  const moved = (id: string) => Math.abs(byId.get(id)!.x - tidy.get(id)!.x) > 0.5 || Math.abs(byId.get(id)!.y - tidy.get(id)!.y) > 0.5;
  const others = (edge: LayoutEdge) => nodes.filter((node) => node.id !== edge.source && node.id !== edge.target);
  const rerouted = new Set(auto.edges.filter((edge) => moved(edge.source) || moved(edge.target) || !routeIsClear(edge.points.slice(1, -1), others(edge), 2)).map((edge) => edge.target));
  // Several connectors into one card fan out along its top edge, ordered by where they come from.
  const arrivals = new Map<string, number>();
  for (const target of rerouted) {
    const group = auto.edges.filter((edge) => edge.target === target && !edge.open);
    const spacing = compact ? 0 : Math.min(ARRIVAL_SPACING, (NODE_WIDTH - 80) / Math.max(1, group.length - 1));
    const centre = (id: string) => byId.get(id)!.x + byId.get(id)!.width / 2;
    [...group].sort((a, b) => centre(a.source) - centre(b.source)).forEach((edge, index) => arrivals.set(edge.id, centre(target) + (index - (group.length - 1) / 2) * spacing));
  }
  const incoming = new Map<string, number>();
  for (const edge of auto.edges) if (!edge.open) incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  const edges = auto.edges.map((edge) => {
    if (!rerouted.has(edge.target)) return edge;
    const from = byId.get(edge.source)!, to = byId.get(edge.target)!;
    const start = { x: from.x + from.width / 2, y: from.y + from.height };
    const end = { x: arrivals.get(edge.id) ?? to.x + to.width / 2, y: to.y };
    return finishEdge(edge, freeRoute(start, end, from, to, others(edge)), (incoming.get(edge.target) ?? 0) > 1, compact);
  });
  return { nodes, edges: spreadLabels(edges) };
}
