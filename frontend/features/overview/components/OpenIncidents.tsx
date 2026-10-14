"use client";

import Typography from "@mui/material/Typography";
import type { ApiOverviewIncident } from "@/features/overview/types";
import { OverviewPanel } from "./OverviewPanel";
import { EmptyState } from "@/shared/components/EmptyState";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";

/** The open incidents, newest first. */
export function OpenIncidents({ incidents }: { incidents: ApiOverviewIncident[] }) {
  return (
  <OverviewPanel title="Open incidents" height={300} subtitle="Latest exceptions requiring attention" href="/incidents">
    <div className={incidents.length === 0 ? "flex h-full flex-col" : "flex flex-col"}>
      {incidents.length === 0 && (
        <EmptyState title="No open incidents" description="Delivery exceptions requiring attention will appear here." icon={<VerifiedUserOutlinedIcon />} />
      )}
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className="border-b border-dashed border-slate-200 py-4 first:pt-0 last:border-0 last:pb-0"
        >
          <div className="mb-1 flex items-center justify-between">
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "#b91c1c",
                fontFamily: "var(--font-geist-mono)",
              }}
            >
              {incident.id}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#64748b", fontWeight: 500 }}
            >
              {incident.jobNumber}
            </Typography>
          </div>
          <Typography variant="body2" sx={{ fontSize: 12.5, color: "#475569", lineHeight: 1.7 }}>
            {incident.summary}
          </Typography>
        </div>
      ))}
    </div>
  </OverviewPanel>
  );
}
