import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ApiOverviewJob } from "@/features/overview/types";
import { OverviewPanel } from "./OverviewPanel";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { EmptyState } from "@/shared/components/EmptyState";

/** Health of the latest jobs returned by the overview API (up to twelve). */
export function DeliverySummary({ jobs }: { jobs: ApiOverviewJob[] }) {
  const delayed = jobs.filter((job) => job.status === "DELAYED").length;
  const exceptions = jobs.filter((job) => job.status !== "DELAYED" && (job.exception || job.status.includes("INCIDENT"))).length;
  const clear = jobs.length - delayed - exceptions;
  const groups = [
    { label: "No reported exception", value: clear, color: "#1e3a8a" },
    { label: "Delayed", value: delayed, color: "#d97706" },
    { label: "Other exceptions", value: exceptions, color: "#dc2626" },
  ];
  let offset = 0;
  return (
    <OverviewPanel title="Delivery health" height={400} subtitle={`Latest ${jobs.length} active jobs · refreshed every 15 seconds`} href="/jobs/live">
      {jobs.length === 0 ? <EmptyState title="No active deliveries" description="Delivery health will appear when jobs are on the road." icon={<LocalShippingOutlinedIcon />} /> : <>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 3, flexWrap: "wrap", py: 1 }}>
        <Box sx={{ position: "relative", width: 180, height: 180, flexShrink: 0 }}>
          <svg viewBox="0 0 120 120" width="180" height="180" aria-hidden="true">
            <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="15" />
            {groups.map((group) => {
              const share = jobs.length ? group.value / jobs.length * 100 : 0;
              const start = offset;
              offset += share;
              return <circle key={group.label} cx="60" cy="60" r="48" fill="none" stroke={group.color} strokeWidth="15" pathLength="100"
                strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 60 60)" />;
            })}
          </svg>
          <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontSize: 32, lineHeight: 1.2, fontWeight: 700 }}>{jobs.length}</Typography>
            <Typography sx={{ fontSize: 12, color: "#64748b" }}>Latest jobs</Typography>
          </Box>
        </Box>
        <Box sx={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 2 }}>
          {groups.map((group) => <Box key={group.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box aria-hidden="true" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: group.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12.5, color: "#475569", flex: 1 }}>{group.label}</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{group.value}</Typography>
          </Box>)}
        </Box>
      </Box>
      </>}
    </OverviewPanel>
  );
}
