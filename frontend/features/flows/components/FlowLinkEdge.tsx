"use client";

import { BaseEdge, EdgeLabelRenderer, type Edge, type EdgeProps } from "@xyflow/react";
import { Box, IconButton, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { Point } from "../flowLayout";

export interface LinkData {
  path: string; label?: string; details: string[]; labelAt?: Point; plusAt?: Point; open: boolean; busy: boolean;
  onAdd: (anchor: HTMLElement) => void; onSelect: () => void; onDelete: () => void;
  [key: string]: unknown;
}
export type LinkEdge = Edge<LinkData, "link">;

const placeAt = (point: Point) => `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`;

/** A connector with its answer label on the line and a "+" to put a new step in the middle of it. */
export function FlowLinkEdge({ id, data, selected, markerEnd }: EdgeProps<LinkEdge>) {
  if (!data) return null;
  const { path, label, details, labelAt, plusAt, open, busy, onAdd, onSelect, onDelete } = data;
  return <>
    <BaseEdge id={id} path={path} markerEnd={open ? undefined : markerEnd} interactionWidth={18} style={{ stroke: selected ? "#1e3a8a" : "#94a3b8", strokeWidth: selected ? 2.5 : 1.75, strokeDasharray: open ? "5 5" : undefined }} />
    <EdgeLabelRenderer>
      {label && labelAt && <Tooltip title={<Box>{details.map((line) => <Box key={line}>{line}</Box>)}</Box>}><Box className="nodrag nopan" onClick={onSelect} sx={{
        position: "absolute", transform: placeAt(labelAt), pointerEvents: "all", cursor: "pointer", maxWidth: 140, px: 1.25, height: 22, display: "flex", alignItems: "center",
        bgcolor: "#fff", border: "1px solid", borderColor: selected ? "#1e3a8a" : "#cbd5e1", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}><Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</Box></Box></Tooltip>}
      {plusAt && selected && <Tooltip title="Delete this connection (Delete key)"><span style={{ position: "absolute", transform: placeAt(plusAt), pointerEvents: "all" }}>
        <IconButton className="nodrag nopan" disabled={busy} aria-label="Delete this connection" onClick={(event) => { event.stopPropagation(); onDelete(); }}
          sx={{ width: 24, height: 24, bgcolor: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", "&:hover": { bgcolor: "#dc2626", color: "#fff" } }}><CloseRoundedIcon sx={{ fontSize: 15 }} /></IconButton>
      </span></Tooltip>}
      {plusAt && !selected && <Tooltip title="Add a step here"><span style={{ position: "absolute", transform: placeAt(plusAt), pointerEvents: "all" }}>
        <IconButton className="nodrag nopan" disabled={busy} aria-label={label ? `Add a step after ${label}` : "Add a step here"} onClick={(event) => { event.stopPropagation(); onAdd(event.currentTarget); }}
          sx={{ width: 22, height: 22, bgcolor: "#edf2fc", border: "1px solid #c7d2fe", color: "primary.main", "&:hover": { bgcolor: "primary.main", color: "#fff" } }}><AddRoundedIcon sx={{ fontSize: 15 }} /></IconButton>
      </span></Tooltip>}
    </EdgeLabelRenderer>
  </>;
}
