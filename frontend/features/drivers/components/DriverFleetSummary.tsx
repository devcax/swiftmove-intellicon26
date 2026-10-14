import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { DonutChart, type DonutSegment } from "@/shared/components/DonutChart";
import { EmptyState } from "@/shared/components/EmptyState";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import type { Driver } from "../types";

const vehicleColors = ["#1e3a8a", "#0f766e", "#d97706", "#7c3aed", "#0284c7", "#db2777", "#64748b"];

export function DriverFleetSummary({ drivers }: { drivers: Driver[] | null }) {
  const fleet = drivers ?? [];
  const statuses: DonutSegment[] = [
    { label: "Active", value: fleet.filter((driver) => driver.status === "ACTIVE").length, color: "#0f766e" },
    { label: "Inactive", value: fleet.filter((driver) => driver.status === "INACTIVE").length, color: "#94a3b8" },
    { label: "Suspended", value: fleet.filter((driver) => driver.status === "SUSPENDED").length, color: "#e11d48" },
  ];
  const vehicleCounts = new Map<string, number>();
  fleet.forEach((driver) => { const type = driver.vehicleType || "Unspecified"; vehicleCounts.set(type, (vehicleCounts.get(type) ?? 0) + 1); });
  const vehicles = Array.from(vehicleCounts, ([label, value], index) => ({ label, value, color: vehicleColors[index % vehicleColors.length] }));
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
    {[{ title: "Fleet status", subtitle: "Current WhatsApp bot access", segments: statuses }, { title: "Vehicle mix", subtitle: "Registered vehicle types", segments: vehicles }].map((section) => <Paper key={section.title} component="section" sx={{ border: 0, borderRadius: 1.5, p: 3 }}>
      <Typography component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>{section.title}</Typography>
      <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.5, mb: 2 }}>{section.subtitle}</Typography>
      {!drivers ? <SectionPreloader label="Loading fleet…" /> : !fleet.length ? <EmptyState title="Your fleet starts here" description="Add a driver to see fleet and vehicle summaries." /> : <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: 2 }}>
        <DonutChart segments={section.segments} label={section.title} />
        <Box sx={{ flex: "1 1 150px", display: "flex", flexDirection: "column", gap: 1.25 }}>
          {section.segments.map((segment) => <Box key={segment.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: segment.color }} />
            <Typography sx={{ flex: 1, fontSize: 12.5, color: "#475569" }}>{segment.label}</Typography><Typography sx={{ fontSize: 13, fontWeight: 600 }}>{segment.value}</Typography>
          </Box>)}
        </Box>
      </Box>}
    </Paper>)}
  </Box>;
}
