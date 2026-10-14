"use client";

import * as React from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import { FormTextField } from "@/shared/components/FormTextField";
import { IncidentDrawer } from "@/features/incidents/components/IncidentDrawer";
import { IncidentFilters } from "@/features/incidents/components/IncidentFilters";
import { IncidentsTable } from "@/features/incidents/components/IncidentsTable";
import { useIncidents } from "@/features/incidents/hooks/useIncidents";
import { IncidentMetrics } from "@/features/incidents/components/IncidentMetrics";
import { SEVERITIES, filterIncidents } from "@/features/incidents/metrics";
import { humanize } from "@/lib/format";

export default function IncidentsPage() {
  return <React.Suspense fallback={<Box role="status" sx={{ p: 3 }}>Loading incidents…</Box>}><IncidentsContent /></React.Suspense>;
}

function IncidentsContent() {
  const inc = useIncidents();
  const [severity, setSeverity] = React.useState("");
  const visible = inc.incidents === null ? null : filterIncidents(inc.incidents, "", severity);
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1500px] flex-col gap-6 p-4 sm:p-6">
      <IncidentMetrics incidents={inc.allIncidents} error={inc.error} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <IncidentFilters filter={inc.filter} onFilter={inc.changeFilter} />
        <FormTextField select label="Severity" value={severity} onChange={event => setSeverity(event.target.value)} sx={{ width: 170 }}>
          <MenuItem value="">All severities</MenuItem>{SEVERITIES.map(value => <MenuItem key={value} value={value}>{humanize(value)}</MenuItem>)}
        </FormTextField>
      </Box>

      {inc.actionError && (
        <Paper sx={{ mb: 2, p: 1.5, bgcolor: "#fef2f2", border: "1px solid #fecaca" }} role="alert">
          <Typography variant="body2" sx={{ color: "#b91c1c", fontWeight: 600 }}>{inc.actionError}</Typography>
        </Paper>
      )}

      <Paper sx={{ borderRadius: 1.5, overflow: "hidden", minWidth: 0, boxShadow: "0 2px 6px rgba(15,23,42,0.04)" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2.5, borderBottom: "1px solid #eef0f4" }}>
          <Typography component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>Incident register</Typography>
          <Typography sx={{ color: "#64748b", fontSize: 12 }}>{visible === null ? "Loading…" : `${visible.length} incident${visible.length === 1 ? "" : "s"}`}</Typography>
        </Box>
        <Box role="tabpanel" id="incident-table-panel" aria-labelledby={`incident-tab-${inc.filter || "all"}`} sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
          <IncidentsTable incidents={visible} error={inc.error} onOpen={(id) => void inc.openDetail(id)} />
        </Box>
      </Paper>
      <IncidentDrawer open={inc.selectedId !== null} detail={inc.detail} notes={inc.notes} onNotes={inc.setNotes} busy={inc.busy} run={inc.run} onClose={inc.closeDetail} />
    </div>
  );
}
