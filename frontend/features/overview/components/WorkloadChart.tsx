import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ApiOverviewKpi } from "@/features/overview/types";
import { OverviewPanel } from "./OverviewPanel";

const colors = ["#1e3a8a", "#0284c7", "#0f766e", "#b45309", "#dc2626", "#4c62a6"];

/** Current counts, not a historical trend; categories can overlap. */
export function WorkloadChart({ kpis }: { kpis: ApiOverviewKpi[] }) {
  const maximum = Math.max(1, ...kpis.map((item) => item.value));
  return (
    <OverviewPanel title="Workload snapshot" subtitle="Current operational counts · categories may overlap">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {kpis.map((item, index) => (
          <Box key={item.label}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.75 }}>
              <Typography sx={{ fontSize: 12.5, color: "#475569" }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{item.value.toLocaleString()}</Typography>
            </Box>
            <Box aria-hidden="true" sx={{ height: 8, borderRadius: 1, bgcolor: "#f1f5f9", overflow: "hidden" }}>
              <Box sx={{ height: "100%", width: `${item.value / maximum * 100}%`, borderRadius: 1, bgcolor: colors[index % colors.length] }} />
            </Box>
          </Box>
        ))}
      </Box>
    </OverviewPanel>
  );
}
