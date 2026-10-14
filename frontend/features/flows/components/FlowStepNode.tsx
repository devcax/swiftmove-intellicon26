"use client";

import * as React from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Box, Chip, IconButton, ListItemIcon, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CallSplitRoundedIcon from "@mui/icons-material/CallSplitRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SmartButtonOutlinedIcon from "@mui/icons-material/SmartButtonOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import type { ApiFlowMeta, ApiFlowStep } from "../types";
import { STEP_TYPE_META } from "../model";
import { NODE_HEIGHT, NODE_WIDTH } from "../flowLayout";

export const stepIcons = { SAY: ChatBubbleOutlineRoundedIcon, ASK_CHOICE: SmartButtonOutlinedIcon, ASK_TEXT: HelpOutlineRoundedIcon, ASK_LOCATION: LocationOnOutlinedIcon, ASK_PHOTO: PhotoCameraOutlinedIcon, ACTION: SettingsOutlinedIcon, IF: CallSplitRoundedIcon, END: StopCircleOutlinedIcon };
const TRIGGER_TONE = "#1e3a8a";
const hiddenHandle = { opacity: 0, pointerEvents: "none" as const };

export interface StepNodeData {
  kind: "trigger" | "step" | "open";
  step?: ApiFlowStep; meta: ApiFlowMeta; compact: boolean; entry: boolean; issues: number; orphan: boolean; busy: boolean; canRemove: boolean;
  startsWhen?: string; openLabel?: string;
  onEdit: () => void; onRemove: () => void; onAdd: (anchor: HTMLElement) => void;
  [key: string]: unknown;
}
export type StepNode = Node<StepNodeData, "flow">;

/** One short line that says what the step does, in the manager's words. */
export function describeStep(step: ApiFlowStep, meta: ApiFlowMeta): { text: string; empty: boolean } {
  const say = (step.text ?? "").trim();
  if (step.type === "ACTION") { const label = meta.actions.find((action) => action.name === step.name)?.label; return { text: label ?? "Choose an action", empty: !label }; }
  if (step.type === "IF") { const label = meta.conditions.find((condition) => condition.name === step.check)?.label; return { text: label ?? "Choose a condition", empty: !label }; }
  const dynamic = step.promptFrom ? meta.promptProviders.find((item) => item.name === step.promptFrom)?.label ?? step.promptFrom : undefined;
  const buttons = step.type === "ASK_CHOICE" ? ` · ${step.options?.length ?? 0} buttons` : "";
  if (say) return { text: `${say}${buttons}`, empty: false };
  if (dynamic) return { text: `Dynamic question: ${dynamic}${buttons}`, empty: false };
  if (step.type === "END") return { text: "Conversation ends here", empty: false };
  if (step.sendText === false) return { text: `Waits for the driver${buttons}`, empty: false };
  return { text: "Write the message…", empty: true };
}

function StepMenu({ anchor, onClose, node }: { anchor: HTMLElement | null; onClose: () => void; node: StepNodeData }) {
  return <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={onClose} onClick={(event) => event.stopPropagation()}>
    <MenuItem onClick={() => { onClose(); node.onEdit(); }}><ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>Edit step</MenuItem>
    <MenuItem disabled={node.busy || !node.canRemove} onClick={() => { onClose(); node.onRemove(); }} sx={{ color: "#b91c1c" }}><ListItemIcon sx={{ color: "inherit" }}><DeleteOutlineRoundedIcon fontSize="small" /></ListItemIcon>{node.canRemove ? "Delete step" : "Keep one End step"}</MenuItem>
  </Menu>;
}

export function FlowStepNode({ data, selected }: NodeProps<StepNode>) {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  if (data.kind === "open") {
    return <Box>
      <Handle type="target" position={Position.Top} isConnectable={false} style={hiddenHandle} />
      <Tooltip title={`Add the next step${data.openLabel ? ` · ${data.openLabel}` : ""}`}>
        <IconButton className="nodrag nopan" disabled={data.busy} aria-label={`Add next step${data.openLabel ? ` for ${data.openLabel}` : ""}`} onClick={(event) => { event.stopPropagation(); data.onAdd(event.currentTarget); }}
          sx={{ width: 40, height: 40, bgcolor: "#fff", color: "primary.main", border: "2px dashed #94a3b8", "&:hover": { bgcolor: "#edf2fc", borderColor: "primary.main" } }}><AddRoundedIcon /></IconButton>
      </Tooltip>
    </Box>;
  }
  const { step, meta, issues } = data;
  const trigger = data.kind === "trigger";
  const tone = step ? STEP_TYPE_META[step.type].tone : TRIGGER_TONE;
  const Icon = step ? stepIcons[step.type] : BoltRoundedIcon;
  const summary = step ? describeStep(step, meta) : { text: data.startsWhen || "Choose what starts this conversation", empty: !data.startsWhen };
  const title = step ? STEP_TYPE_META[step.type].label : "Conversation starts";
  if (data.compact) {
    // Zoomed out: an icon tile in the middle of the card's footprint, so the connectors still meet it.
    return <Box sx={{ width: NODE_WIDTH, height: NODE_HEIGHT, display: "flex", justifyContent: "center" }}>
      {!trigger && <Handle type="target" position={Position.Top} isConnectable={false} style={hiddenHandle} />}
      <Tooltip title={`${title} · ${summary.text}`} placement="right">
        <Box aria-label={title} sx={{ position: "relative", width: NODE_HEIGHT, height: NODE_HEIGHT, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#fff", color: tone, cursor: "pointer", border: "2px solid", borderColor: selected ? tone : issues ? "#dc2626" : `${tone}66`, borderRadius: "18px", boxShadow: selected ? `0 0 0 4px ${tone}33` : "0 1px 3px rgba(15, 23, 42, 0.1)" }}>
          <Icon sx={{ fontSize: 34 }} />
          {issues > 0 && <Box sx={{ position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: "50%", bgcolor: "#dc2626", border: "2px solid #fff" }} />}
        </Box>
      </Tooltip>
      <Handle type="source" position={Position.Bottom} isConnectable={false} style={hiddenHandle} />
    </Box>;
  }
  return <Box title={summary.text} sx={{
    width: NODE_WIDTH, height: NODE_HEIGHT, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 1.25, pl: 1.25, pr: 0.5, bgcolor: "#fff", cursor: "pointer",
    border: "1px solid", borderColor: selected ? tone : issues ? "#dc2626" : "#cbd5e1", borderRadius: "12px",
    boxShadow: selected ? `0 0 0 3px ${tone}33` : "0 1px 2px rgba(15, 23, 42, 0.06)", transition: "border-color 120ms, box-shadow 120ms",
    "&:hover": { borderColor: selected ? tone : "#94a3b8", boxShadow: selected ? `0 0 0 3px ${tone}33` : "0 2px 8px rgba(15, 23, 42, 0.12)" },
  }}>
    {!trigger && <Handle type="target" position={Position.Top} isConnectable={false} style={hiddenHandle} />}
    <Box sx={{ width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", bgcolor: `${tone}14`, color: tone }}><Icon sx={{ fontSize: 21 }} /></Box>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{title}</Typography>
        {data.entry && <Chip label="First step" size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#edf2fc", color: "primary.main" }} />}
        {data.orphan && <Tooltip title="Nothing leads to this step yet, so the conversation never reaches it."><Chip label="Not connected" size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#fef3c7", color: "#92400e" }} /></Tooltip>}
      </Box>
      <Typography sx={{ mt: 0.25, fontSize: 12, lineHeight: 1.35, color: summary.empty ? "#b45309" : "#475569", fontStyle: summary.empty ? "italic" : "normal", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>{summary.text}</Typography>
    </Box>
    {issues > 0 && <Tooltip title={`${issues} thing${issues === 1 ? "" : "s"} to fix`}><Chip label={issues} size="small" color="error" sx={{ height: 20, minWidth: 20, fontSize: 11, "& .MuiChip-label": { px: 0.75 } }} /></Tooltip>}
    {step && <>
      <IconButton className="nodrag nopan" size="small" aria-label={`More actions for ${STEP_TYPE_META[step.type].label}`} onClick={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); }}><MoreHorizRoundedIcon fontSize="small" /></IconButton>
      <StepMenu anchor={menuAnchor} onClose={() => setMenuAnchor(null)} node={data} />
    </>}
    <Handle type="source" position={Position.Bottom} isConnectable={false} style={hiddenHandle} />
  </Box>;
}
