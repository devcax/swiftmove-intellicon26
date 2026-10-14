import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { CircularMetric } from "@/shared/components/CircularMetric";
import { humanize } from "@/lib/format";
import { SEVERITY_TONE } from "../constants";
import { incidentMetrics } from "../metrics";
import type { ApiIncidentSummary } from "../types";

export function IncidentMetrics({ incidents, error }: { incidents: ApiIncidentSummary[] | null; error: string | null }) {
  return <Paper sx={{ p: 3, borderRadius: 1.5, boxShadow: "0 2px 6px rgba(15,23,42,0.04)" }}>
    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 3 }}>
      <Typography component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>Incident severity</Typography>
      <Typography sx={{ color: "#64748b", fontSize: 11.5 }}>{error ? "Metrics unavailable" : incidents === null ? "Loading incidents…" : `${incidents.length} loaded incidents · Share by severity`}</Typography>
    </Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 3 }}>
      {incidentMetrics(incidents ?? []).map(metric => <CircularMetric key={metric.severity} label={humanize(metric.severity)} value={metric.percentage} color={SEVERITY_TONE[metric.severity].fg} loading={incidents === null || Boolean(error)} description={incidents === null || error ? "— incidents" : `${metric.count} incident${metric.count === 1 ? "" : "s"}`} />)}
    </Box>
  </Paper>;
}
