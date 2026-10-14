"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { ActivityBarChart } from "@/shared/components/ActivityBarChart";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { reviewActivity, type ActivityPeriod } from "../activity";
import type { ApiRequestHistoryEntry, QueueTab } from "../types";

const panel = { bgcolor: "#fff", borderRadius: 1.5, p: 2.5, boxShadow: "0 2px 6px rgba(15,23,42,0.04)" };
export function QueueOverview({ pendingCount, cancelCount, closureCount, history, loading, error, onTab }: {
  pendingCount: number; cancelCount: number; closureCount: number;
  history: ApiRequestHistoryEntry[] | null; loading: boolean; error: string | null; onTab: (tab: QueueTab) => void;
}) {
  const [period, setPeriod] = useState<ActivityPeriod>("week");
  const data = reviewActivity(history ?? [], period);
  const reviewed = data.reduce((sum, bucket) => sum + bucket.value, 0);
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(280px, 1fr) minmax(0, 2fr)" }, gap: 3 }}>
    <Paper sx={panel}>
      <Typography component="h2" sx={{ fontWeight: 700, fontSize: 18 }}>Queue overview</Typography>
      <Typography sx={{ fontSize: 12, color: "#64748b", mt: 1, mb: 2 }}>Review driver requests, resolve cancellations, and close delivered trips.</Typography>
      {([
        ["requests", "Job requests", pendingCount, "#1e3a8a"],
        ["cancellations", "Cancellations", cancelCount, "#b45309"],
        ["closures", "Awaiting closure", closureCount, "#0f766e"],
      ] as const).map(([tab, title, count, color]) => <Button key={tab} onClick={() => onTab(tab)} fullWidth sx={{ justifyContent: "space-between", borderRadius: 0, borderBottom: "1px solid #eef0f4", py: 1.25, px: 0, color: "#475569", textTransform: "none", fontSize: 12.5 }}>
        {title}<Box component="span" sx={{ color, fontWeight: 700, fontSize: 17 }}>{loading ? "—" : count}</Box>
      </Button>)}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
        <Typography sx={{ color: "#64748b", fontSize: 12 }}>Total awaiting review</Typography>
        <Typography sx={{ color: "#1e3a8a", fontSize: 24, fontWeight: 700 }}>{loading ? "—" : pendingCount + cancelCount + closureCount}</Typography>
      </Box>
    </Paper>
    <Paper sx={{ ...panel, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
        <Box><Typography component="h2" sx={{ fontWeight: 700, fontSize: 18 }}>Review activity</Typography>
          <Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 0.5 }}>{error ? "Activity unavailable" : history === null ? "Loading decisions…" : `${reviewed} decisions · From loaded request history`}</Typography></Box>
        <ToggleButtonGroup value={period} exclusive onChange={(_, value: ActivityPeriod | null) => value && setPeriod(value)} size="small" aria-label="Review activity period" sx={{ bgcolor: "#f3f4f6", p: 0.5, borderRadius: 1.5, "& .MuiToggleButton-root": { border: 0, borderRadius: "6px !important", textTransform: "none", px: 1.5, py: 0.5, fontSize: 12 }, "& .MuiToggleButton-root.Mui-selected": { bgcolor: "#1e3a8a", color: "#fff", "&:hover": { bgcolor: "#1e40af" } } }}>
          <ToggleButton value="week">Week</ToggleButton><ToggleButton value="month">Month</ToggleButton><ToggleButton value="year">Year</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {error ? <Typography role="alert" sx={{ color: "#b91c1c", fontSize: 12, py: 6 }}>{error}</Typography> : history === null ? <SectionPreloader label="Loading review activity…" /> : <ActivityBarChart data={data} label="Reviewed driver requests over time" />}
      {history !== null && reviewed === 0 && <Typography sx={{ fontSize: 11.5, color: "#64748b", textAlign: "center" }}>No reviewed decisions in this period.</Typography>}
    </Paper>
  </Box>;
}
