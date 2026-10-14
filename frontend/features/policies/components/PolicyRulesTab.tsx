"use client";
import { useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { FormTextField } from "@/shared/components/FormTextField";
import { EmptyState } from "@/shared/components/EmptyState";
import { BottomStickySidebar } from "@/shared/components/BottomStickySidebar";
import PolicyCard from "./PolicyCard";
import type { PoliciesState } from "../hooks/usePolicies";
import type { ApiPolicyListPayload } from "../types";

const panelSx = { borderRadius: 1.5, bgcolor: "#fff", boxShadow: "0 2px 6px rgba(15,23,42,0.04)" };

/** Filter and create on the left; readable operational rules on the right. */
export function PolicyRulesTab({ policies, data, kind = "rules" }: { policies: PoliciesState; data: ApiPolicyListPayload; kind?: "rules" | "settings" }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [action, setAction] = useState("");
  const { flows, busy, ruleGroups, settingGroups, setOpenedKey, askToggle, askPublish } = policies;
  const groups = kind === "settings" ? settingGroups : ruleGroups;
  const query = search.trim().toLowerCase();
  const visible = groups.filter(group => {
    const head = group.head;
    const label = data.actions.find(item => item.name === head.action)?.label ?? head.action;
    const matchesStatus = !status || (status === "LIVE" ? head.status === "PUBLISHED" && head.enabled : status === "PAUSED" ? head.status === "PUBLISHED" && !head.enabled : group.versions.some(version => version.status === status));
    return matchesStatus && (!action || head.action === action) && [head.name, head.description ?? "", label].some(text => text.toLowerCase().includes(query));
  });
  const actions = data.actions.filter(item => groups.some(group => group.head.action === item.name));
  const title = kind === "settings" ? "Operational settings" : "Operational rules";
  const live = groups.filter(group => group.head.status === "PUBLISHED" && group.head.enabled).length;
  const drafts = groups.filter(group => group.versions.some(version => version.status === "DRAFT")).length;
  const paused = groups.filter(group => group.head.status === "PUBLISHED" && !group.head.enabled).length;
  return <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
    {data.store.source === "fallback" && <Alert severity="warning">The policy tables are not readable, so built-in rules are active. Apply the database migrations to manage rules here.</Alert>}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "310px minmax(0, 1fr)" }, gap: 3, alignItems: "start" }}>
      <BottomStickySidebar>
      <Paper component="aside" aria-label="Policy filters and controls" sx={{ ...panelSx, p: 2.5 }}>
        <Typography component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>{title}</Typography>
        <Typography sx={{ fontSize: 12, color: "#64748b", lineHeight: 1.8, mt: 1, mb: 3 }}>{kind === "settings" ? "Manage scheduled behavior, time windows, and thresholds used by your operations." : "Define the requirements for job actions, then test how the dispatcher responds when something is missing."}</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <FormTextField label={kind === "settings" ? "Search settings" : "Search rules"} placeholder="Name, description, or action" value={search} onChange={event => setSearch(event.target.value)} />
          <FormTextField select label="Status" value={status} onChange={event => setStatus(event.target.value)}>
            <MenuItem value="">All statuses</MenuItem><MenuItem value="LIVE">Live</MenuItem><MenuItem value="DRAFT">Has a draft</MenuItem><MenuItem value="PAUSED">Paused</MenuItem><MenuItem value="ARCHIVED">Has archived versions</MenuItem>
          </FormTextField>
          <FormTextField select label="Applies to" value={action} onChange={event => setAction(event.target.value)}>
            <MenuItem value="">All actions</MenuItem>{actions.map(item => <MenuItem key={item.name} value={item.name}>{item.label}</MenuItem>)}
          </FormTextField>
          <Button component={Link} href="/policies/new" variant="contained" startIcon={<AddRoundedIcon />} disabled={busy}>Create operational rule</Button>
          <Button variant="outlined" startIcon={<PlayArrowRoundedIcon />} onClick={() => policies.setTab(1)}>Test a rule</Button>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", mt: 3, pt: 2, borderTop: "1px solid #eef0f4", textAlign: "center" }}>
          {[["Live", live], ["With drafts", drafts], ["Paused", paused]].map(([label, count]) => <Box key={label}><Typography sx={{ fontSize: 21, fontWeight: 700, color: "#1e3a8a" }}>{count}</Typography><Typography sx={{ fontSize: 10.5, color: "#64748b", mt: 0.5 }}>{label}</Typography></Box>)}
        </Box>
        <Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 2.5, lineHeight: 1.8 }}>Need to change the bot’s help or FAQ replies? <Link href="/flows" style={{ color: "#1e3a8a" }}>Open bot conversations</Link>.</Typography>
      </Paper>
      </BottomStickySidebar>
      <Paper sx={{ ...panelSx, minWidth: 0, overflow: "hidden" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: 2.5, borderBottom: "1px solid #eef0f4" }}>
          <Box><Typography component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>{title}</Typography><Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 0.5 }}>Expand an item to review its requirements and behavior.</Typography></Box>
          <Typography sx={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{visible.length} of {groups.length}</Typography>
        </Box>
        {visible.length === 0 ? <EmptyState title="No matching policies" description="Try another filter or create a new operational rule." /> : visible.map((group, index) => <PolicyCard key={group.key} group={group} defaultExpanded={index === 0} capabilities={data.capabilities} actions={data.actions} flows={flows} busy={busy}
          onOpen={item => setOpenedKey(item.key)} onToggle={(item, enabled) => askToggle(item.head, enabled)} onPublish={item => askPublish(item.head, item)} />)}
      </Paper>
    </Box>
  </Box>;
}
