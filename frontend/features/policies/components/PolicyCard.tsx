"use client";

// ---------------------------------------------------------------------------
// PolicyCard — one operational rule in the list: status, plain-English
// summary, enable switch, and the quick actions. Everything else (versions,
// rollback, advanced view) lives in the detail dialog.
// ---------------------------------------------------------------------------

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import FormControlLabel from "@mui/material/FormControlLabel";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import PolicySections from "./PolicySections";
import Chip from "@mui/material/Chip";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { usesAttachmentOnlyCheck } from "@/features/policies/utils";
import type { PolicyGroup } from "@/features/policies/utils";
import type { ApiCapability, ApiPolicyAction } from "@/features/policies/types";
import type { ApiFlowSummary } from "@/features/flows/types";

export function statusChip(status: string, enabled: boolean) {
  if (status === "PUBLISHED") {
    return enabled
      ? { label: "Live", color: "success" as const }
      : { label: "Live · paused", color: "warning" as const };
  }
  if (status === "DRAFT") return { label: "Draft", color: "default" as const };
  return { label: "Archived", color: "default" as const };
}

/** What is wrong with the conversation a rule links to, or null when it is fine (or there is none). */
export function linkedFlowProblem(flowKey: string | null | undefined, flows: ApiFlowSummary[]): string | null {
  if (!flowKey) return null;
  const flow = flows.find((f) => f.key === flowKey);
  if (!flow) return `The conversation “${flowKey}” does not exist, so drivers get the standard message.`;
  if (flow.publishedVersion == null) return `The conversation “${flow.name}” is not published yet, so drivers get the standard message.`;
  if (!flow.enabled) return `The conversation “${flow.name}” is switched off, so drivers get the standard message.`;
  return null;
}

export default function PolicyCard({
  group,
  capabilities,
  actions,
  flows = [],
  busy,
  onOpen,
  onToggle,
  onPublish,
  defaultExpanded = false,
}: {
  group: PolicyGroup;
  capabilities: ApiCapability[];
  actions: ApiPolicyAction[];
  flows?: ApiFlowSummary[];
  busy: boolean;
  onOpen: (group: PolicyGroup) => void;
  onToggle: (group: PolicyGroup, enabled: boolean) => void;
  onPublish: (group: PolicyGroup) => void;
  defaultExpanded?: boolean;
}) {
  const { head, versions } = group;
  const chip = statusChip(head.status, head.enabled);
  const isSetting = head.enforcement === "SETTING";
  const action = actions.find((a) => a.name === head.action);
  const newerDraft = versions.find((v) => v.status === "DRAFT" && v.version > head.version);
  const attachmentOnly = usesAttachmentOnlyCheck(head.rule);
  const flowProblem = head.enforcement === "SETTING" ? null : linkedFlowProblem(head.onBlock?.flowKey, flows);

  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters elevation={0} sx={{
      bgcolor: "#fff", border: "1px solid transparent", borderBottomColor: "#e2e8f0",
      "&::before": { display: "none" },
      "&.Mui-expanded": { mx: { xs: 1, sm: 1.5 }, my: 1.5, border: "1px solid #a8b9df", borderRadius: 1.5, overflow: "hidden" },
    }}>
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{
        px: { xs: 2, sm: 2.5 }, py: 1,
        "& .MuiAccordionSummary-content": { minWidth: 0 },
        "&.Mui-expanded": { bgcolor: "#f1f5fc", borderBottom: "1px solid #cbd5e1" },
      }}>
      <Box className="flex items-start justify-between gap-2">
        <Box sx={{ minWidth: 0 }}>
          <Box className="flex flex-wrap items-center gap-1">
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{head.name}</Typography>
            <Chip size="small" color={chip.color} variant={head.status === "PUBLISHED" ? "filled" : "outlined"} label={chip.label} />
            <Chip size="small" variant="outlined" label={`v${head.version}`} />
            {head.isSystem && <Chip size="small" label="built-in" variant="outlined" />}
            {isSetting && <Chip size="small" color="info" variant="outlined" label="setting" />}
            {attachmentOnly && <Chip size="small" color="info" variant="outlined" label="attachment check" />}
          </Box>
          {head.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {head.description}
            </Typography>
          )}
          <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "#64748b" }}>
            {action ? action.label : head.action}
            {versions.length > 1 ? ` · ${versions.length} versions` : ""}
            {newerDraft ? ` · draft v${newerDraft.version} waiting` : ""}
          </Typography>
          {flowProblem && (
            <Typography variant="caption" role="alert" sx={{ mt: 0.5, display: "block", color: "#b45309", fontWeight: 600 }}>
              ⚠ {flowProblem}
            </Typography>
          )}
        </Box>
      </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1 }}>
        <PolicySections policy={head} capabilities={capabilities} actions={actions} flows={flows} compact />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", px: { xs: 2, sm: 2.5 }, py: 1.5, bgcolor: "#f8fafc", borderTop: "1px solid #cbd5e1" }}>
        {!isSetting && head.status !== "ARCHIVED" && (
          <Tooltip title={head.enabled ? "Pause this rule" : "Turn this rule back on"}>
            <FormControlLabel label={<Typography sx={{ fontSize: 12 }}>{head.enabled ? "Rule enabled" : "Rule paused"}</Typography>} control={<Switch
              size="small"
              checked={head.enabled}
              disabled={busy}
              onChange={(e) => onToggle(group, e.target.checked)}
              slotProps={{ input: { "aria-label": `Toggle ${head.name}` } }}
            />} />
          </Tooltip>
        )}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, ml: "auto" }}>
        {head.status === "DRAFT" && (
          <Button size="small" variant="contained" disabled={busy} onClick={() => onPublish(group)}>
            Publish
          </Button>
        )}
        <Button size="small" variant="outlined" onClick={() => onOpen(group)}>
          Version history
        </Button>
        {!isSetting && <Button component={Link} href={`/policies/${head.id}/edit`} size="small" variant="outlined">Edit rule</Button>}
      </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
