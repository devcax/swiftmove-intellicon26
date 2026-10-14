"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { ApiOverviewKpi } from "@/features/overview/types";
import { overviewPanelSx } from "./OverviewPanel";
import { MetricSparkline } from "./MetricSparkline";

const graphColors = ["#f97316", "#0f766e", "#2581d8", "#c026d3", "#dc2626", "#4f46e5"];

const hintColors: Record<string, string> = {
  primary: "#1e3a8a",
  info: "#64748b",
  success: "#15803d",
  warning: "#b45309",
  error: "#dc2626",
  neutral: "#64748b",
};

/** Six live metrics grouped into a single compact dashboard panel. */
export function KpiCards({ kpis, history }: { kpis: ApiOverviewKpi[]; history: Record<string, number[]> }) {
  return (
  <Paper component="section" className="panel-scroll" aria-label="Operations metrics" sx={{ ...overviewPanelSx, height: 360, overflow: "auto", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridAutoRows: "minmax(112px, auto)", p: { xs: 1, sm: 1.5 } }}>
    {kpis.map((kpi, index) => (
        <Box key={kpi.label} sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, minWidth: 0, borderRight: index % 2 === 0 ? "1px solid #eef0f4" : 0, borderBottom: index < kpis.length - 2 ? "1px solid #eef0f4" : 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 0.5 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{kpi.value.toLocaleString()}</Typography>
          <MetricSparkline values={history[kpi.label] ?? [kpi.value]} color={graphColors[index % graphColors.length]} label={kpi.label} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
          <Typography
            variant="body2"
            sx={{ color: "#475569", fontSize: 12.5, lineHeight: 1.4 }}
          >
            {kpi.label}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: hintColors[kpi.tone],
              fontWeight: 500,
              fontSize: 11,
              display: "block",
              lineHeight: 1.4,
            }}
          >
            {kpi.hint}
          </Typography>
          </Box>
        </Box>
    ))}
  </Paper>
  );
}
