"use client";

// ---------------------------------------------------------------------------
// Policies — the single home for operational rules. Managers describe rules
// in plain words (or build them manually), test them against sample
// situations with the real engine, and publish / pause / roll back
// explicitly. General conversations (FAQs, help) live on the Conversations
// page; the technical AI prompts live in the Advanced area.
// ---------------------------------------------------------------------------

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { workspaceTabsSx } from "@/shared/styles/workspaceTabs";
import { PolicyDialogs } from "@/features/policies/components/PolicyDialogs";
import { PolicyRulesTab } from "@/features/policies/components/PolicyRulesTab";
import PolicySimulator from "@/features/policies/components/PolicySimulator";
import { usePolicies } from "@/features/policies/hooks/usePolicies";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

export default function PoliciesPage() {
  const policies = usePolicies();
  const { data, error, tab, setTab, simPreset, confirm, setConfirm } = policies;

  return (
    <Box sx={{ width: "100%", maxWidth: 1500, mx: "auto", px: { xs: 1.5, sm: 2.5 }, py: 2.5 }}>
      <Paper sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, p: 2, mb: 2.5, borderRadius: 1.5, boxShadow: "none" }}>
        <InfoOutlinedIcon sx={{ color: "#1e3a8a", fontSize: 19, mt: 0.25, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12, color: "#475569", lineHeight: 1.8 }}>Operational policies control what the bot, dashboard, and timers allow. New rules and revisions stay as drafts until published. Pausing a live rule takes effect immediately.</Typography>
      </Paper>
      <Tabs value={tab} onChange={(_e, next) => setTab(next)} variant="scrollable" scrollButtons="auto" aria-label="Policy workspace" sx={workspaceTabsSx}>
        <Tab value={0} label="Operational rules" id="policies-tab-0" aria-controls="policies-panel-0" />
        <Tab value={2} label="Operational settings" id="policies-tab-2" aria-controls="policies-panel-2" />
        <Tab value={1} label="Test a rule" id="policies-tab-1" aria-controls="policies-panel-1" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && <SectionPreloader label="Loading policies…" />}

      {data && (tab === 0 || tab === 2) && <Box role="tabpanel" id={`policies-panel-${tab}`} aria-labelledby={`policies-tab-${tab}`}><PolicyRulesTab key={tab} policies={policies} data={data} kind={tab === 2 ? "settings" : "rules"} /></Box>}
      {data && tab === 1 && (
        <Box role="tabpanel" id="policies-panel-1" aria-labelledby="policies-tab-1"><PolicySimulator key={simPreset ?? "action"} policies={data.policies} actions={data.actions} presetPolicyId={simPreset} /></Box>
      )}

      <PolicyDialogs policies={policies} />
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />

    </Box>
  );
}
