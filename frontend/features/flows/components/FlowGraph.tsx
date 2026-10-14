// ---------------------------------------------------------------------------
// Read-only graph preview of a flow definition, auto-laid-out in layers from
// the entry step. Pan/zoom only — editing happens in the step list; clicking
// a node selects that step there.
// ---------------------------------------------------------------------------

"use client";

import * as React from "react";
import { Background, Controls, ReactFlow, type Edge, type Node, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { ApiFlowDefinition, ApiFlowStep } from "@/features/flows/types";
import { STEP_TYPE_META, stepTargets } from "../model";

const LAYER_HEIGHT = 132;
const COLUMN_WIDTH = 216;

type FlowNodeData = { step: ApiFlowStep; selected: boolean; entry: boolean; [key: string]: unknown };
type FlowNode = Node<FlowNodeData>;

function FlowNodeView({ data }: { data: FlowNodeData }) {
  const { step, selected, entry } = data;
  const meta = STEP_TYPE_META[step.type];
  const preview =
    step.type === "ACTION"
      ? step.name
      : step.type === "ASK_CHOICE"
        ? `${step.options?.length ?? 0} option${(step.options?.length ?? 0) === 1 ? "" : "s"}`
        : (step.text ?? step.promptFrom ?? "").slice(0, 46);

  return (
    <Box
      sx={{
        width: 190,
        px: 1.25,
        py: 1,
        borderRadius: 2.5,
        border: "2px solid",
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: "background.paper",
        boxShadow: selected ? 4 : 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
        <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: meta.tone, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ fontWeight: 800, color: meta.tone, letterSpacing: 0.3 }}>
          {meta.label}
        </Typography>
        {entry && <Chip size="small" color="primary" variant="outlined" label="start" sx={{ height: 17, fontSize: 9.5 }} />}
      </Box>
      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, wordBreak: "break-all" }}>
        {step.id}
      </Typography>
      {preview && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontSize: 10.5,
            mt: 0.25,
          }}
        >
          {preview}
        </Typography>
      )}
    </Box>
  );
}

const nodeTypes: NodeTypes = { flowStep: FlowNodeView };

/** BFS layering from the entry step; leftovers (unreachable) go to the bottom. */
function layout(definition: ApiFlowDefinition, selectedId: string | null): { nodes: FlowNode[]; edges: Edge[] } {
  const steps = definition.steps;
  const byId = new Map(steps.map((s) => [s.id, s]));
  const layerOf = new Map<string, number>();

  if (steps.length > 0) {
    const queue: { id: string; layer: number }[] = [{ id: steps[0].id, layer: 0 }];
    while (queue.length > 0) {
      const { id, layer } = queue.shift() as { id: string; layer: number };
      const existing = layerOf.get(id);
      if (existing != null && existing >= layer) continue;
      layerOf.set(id, layer);
      const step = byId.get(id);
      if (!step) continue;
      for (const { target } of stepTargets(step)) {
        queue.push({ id: target, layer: layer + 1 });
      }
    }
  }

  let orphanRow = 0;
  for (const step of steps) {
    if (!layerOf.has(step.id)) {
      const bottom = Math.max(0, ...layerOf.values()) + 1;
      layerOf.set(step.id, bottom + orphanRow);
      orphanRow += 1;
    }
  }

  const perLayer = new Map<number, string[]>();
  for (const step of steps) {
    const layer = layerOf.get(step.id) ?? 0;
    if (!perLayer.has(layer)) perLayer.set(layer, []);
    (perLayer.get(layer) as string[]).push(step.id);
  }

  const nodes: FlowNode[] = steps.map((step) => {
    const layer = layerOf.get(step.id) ?? 0;
    const row = perLayer.get(layer) ?? [];
    const column = row.indexOf(step.id);
    const rowWidth = (row.length - 1) * COLUMN_WIDTH;
    return {
      id: step.id,
      type: "flowStep",
      position: { x: column * COLUMN_WIDTH - rowWidth / 2, y: layer * LAYER_HEIGHT },
      data: { step, selected: step.id === selectedId, entry: step.id === steps[0]?.id },
    };
  });

  // Merge parallel edges between the same pair, joining their labels.
  const edgeMap = new Map<string, Edge>();
  for (const step of steps) {
    for (const { target, label } of stepTargets(step)) {
      const key = `${step.id}→${target}`;
      const existing = edgeMap.get(key);
      if (existing) {
        if (label && !(existing.data?.labels as string[]).includes(label)) {
          (existing.data?.labels as string[]).push(label);
          existing.label = (existing.data?.labels as string[]).join(", ");
        }
        continue;
      }
      edgeMap.set(key, {
        id: key,
        source: step.id,
        target,
        label: label ?? undefined,
        data: { labels: label ? [label] : [] },
        labelStyle: { fontSize: 10, fontWeight: 700 },
        labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
        animated: false,
      });
    }
  }

  return { nodes, edges: [...edgeMap.values()] };
}

export default function FlowGraph({
  definition,
  selectedId,
  onSelect,
}: {
  definition: ApiFlowDefinition;
  selectedId: string | null;
  onSelect: (stepId: string) => void;
}) {
  const { nodes, edges } = React.useMemo(() => layout(definition, selectedId), [definition, selectedId]);

  // Remount only when the topology changes so text edits don't reset pan/zoom.
  const topologyKey = React.useMemo(
    () =>
      definition.steps
        .map((s) => `${s.id}:${s.type}:${stepTargets(s).map((t) => t.target).join(",")}`)
        .join("|"),
    [definition]
  );

  return (
    <Box sx={{ height: "100%", minHeight: 360, borderRadius: 3, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
      <ReactFlow
        key={topologyKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        onNodeClick={(_e, node) => onSelect(node.id)}
        proOptions={{ hideAttribution: true }}
        colorMode="light"
      >
        <Background gap={18} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </Box>
  );
}
