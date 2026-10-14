"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { ApiFlowSummary } from "../types";
import { triggerSummary } from "../model";
import { workspaceTabsSx } from "@/shared/styles/workspaceTabs";
import { EmptyState } from "@/shared/components/EmptyState";
import { FlowStatusChips } from "./FlowStatusChips";

export function FlowListView({ flows, busyKey, onOpen, onToggle, onNew, selectedKey, renderEditor }: {
  flows: ApiFlowSummary[]; busyKey: string | null; onOpen: (key: string | null) => void;
  onToggle: (flow: ApiFlowSummary, enabled: boolean) => void; onNew: () => void;
  selectedKey: string | null; renderEditor: (flow: ApiFlowSummary) => ReactNode;
}) {
  const [filter, setFilter] = useState("");
  const [visited, setVisited] = useState<string[]>([]);
  const visible = flows.filter(flow => !filter || flow.triggerType === filter || flow.key === selectedKey);
  return <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
    <Tabs value={filter} onChange={(_, next: string) => setFilter(next)} variant="scrollable" scrollButtons="auto" aria-label="Conversation categories" sx={{ ...workspaceTabsSx, mb: 0 }}>
      <Tab value="" label="All conversations" /><Tab value="INTENT" label="Driver messages" /><Tab value="BUTTON" label="Button replies" /><Tab value="EVENT" label="Automatic events" />
    </Tabs>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onNew}>Add conversation</Button>
      <Typography sx={{ fontSize: 12, color: "#64748b" }}>{visible.length} conversation{visible.length === 1 ? "" : "s"}</Typography>
    </Box>
    <Typography sx={{ fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>Expand a conversation to change its steps and wording. Save a draft, test it, and publish when ready. Job permissions are controlled by <Link href="/policies" style={{ color: "#1e3a8a" }}>Policies</Link>.</Typography>
    <Paper sx={{ borderRadius: 1.5, overflow: "hidden", boxShadow: "0 2px 6px rgba(15,23,42,0.04)" }}>
      {visible.length === 0 && <EmptyState title="No conversations in this category" description="Add a conversation to respond to a driver’s message." />}
      {flows.map(flow => {
        const open = flow.key === selectedKey;
        const Icon = flow.triggerType === "INTENT" ? ChatBubbleOutlineRoundedIcon : flow.triggerType === "BUTTON" ? TouchAppOutlinedIcon : BoltOutlinedIcon;
        return <Accordion key={flow.key} expanded={open} onChange={(_, expanded) => { setVisited(keys => keys.includes(flow.key) ? keys : [...keys, flow.key]); onOpen(expanded ? flow.key : null); }} disableGutters elevation={0} sx={{ display: visible.includes(flow) ? "block" : "none", "&::before": { display: "none" }, borderBottom: "1px solid #eef0f4", "&:last-child": { borderBottom: 0 }, "&.Mui-expanded": { m: 0 } }}>
          <AccordionSummary expandIcon={open ? <CloseRoundedIcon sx={{ fontSize: 20, color: "#64748b" }} /> : <ExpandMoreRoundedIcon />} aria-controls={`flow-body-${flow.key}`} id={`flow-heading-${flow.key}`} sx={{ px: 2.5, py: 0.75, minHeight: 64 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, width: "100%", pr: 1 }}>
              <Icon sx={{ fontSize: 23, color: "#1e3a8a", flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}><Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{flow.name}</Typography><Typography sx={{ fontSize: 11, color: "#64748b", mt: 0.5 }}>{triggerSummary(flow)}</Typography></Box>
              <Box sx={{ display: { xs: "none", sm: "flex" }, flexWrap: "wrap", gap: 0.75, mr: 1 }}><FlowStatusChips flow={flow} /></Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 3 }, pb: 3, pt: 1 }}>
            {flow.description && <Typography sx={{ fontSize: 12, color: "#64748b", mb: 1 }}>{flow.description}</Typography>}
            <FormControlLabel sx={{ mb: 2 }} control={<Switch size="small" checked={flow.enabled} disabled={flow.publishedVersion == null || busyKey === flow.key} onChange={event => onToggle(flow, event.target.checked)} slotProps={{ input: { 'aria-label': `Enable ${flow.name}` } }} />} label={<Typography sx={{ fontSize: 12 }}>{flow.publishedVersion == null ? "Publish a version to enable this conversation" : flow.enabled ? "Enabled for the dispatcher" : "Paused · using built-in behavior"}</Typography>} />
            {(open || visited.includes(flow.key)) && renderEditor(flow)}
          </AccordionDetails>
        </Accordion>;
      })}
    </Paper>
  </Box>;
}
