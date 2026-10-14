"use client";

import * as React from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import type { ApiJobDetail } from "../../types";
import { CargoBlock } from "./CargoBlock";
import { DriverBlock } from "./DriverBlock";
import { RouteBlock } from "./RouteBlock";
import { ScheduleBlock } from "./ScheduleBlock";
import { SiteCodesBlock } from "./SiteCodesBlock";

interface JobSummaryRowProps {
  job: ApiJobDetail;
  busy: boolean;
  run: (work: () => Promise<unknown>) => Promise<void>;
}

/** The route, cargo, schedule, driver and site codes of the job, with the delay notes and the manual "Verify" for a stage. */
export function JobSummaryRow({ job, busy, run }: JobSummaryRowProps) {
  return (
    <Paper
      sx={{ p: 2, width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden", borderRadius: 2.5, border: "1px solid", borderColor: "divider" }}
      className="w-full shrink-0 shadow-sm"
    >
      <Box className="panel-scroll" role="region" aria-label="Job summary — scroll horizontally for more details" tabIndex={0} sx={{
        width: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden", maxWidth: "100%", pb: 1,
        scrollbarColor: "#cbd5e1 transparent",
        "&::-webkit-scrollbar": { height: 6 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 3 },
        "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "#64748b" },
      }}>
      <Box sx={{
        display: "grid", gridTemplateColumns: "repeat(5, max-content)",
        width: "max-content", minWidth: "100%", justifyContent: "space-between", whiteSpace: "nowrap",
        "& > div": { display: "grid", gridTemplateRows: "24px minmax(72px, 1fr)", gap: 1.5, gridColumn: "auto", px: 1.5, py: 0 },
        "& > div:first-of-type": { pl: 0 },
        "& > div:last-of-type": { pr: 0 },
        "& > div + div": { borderLeft: "1px solid", borderColor: "#f1f5f9" },
        "& > div > div:nth-of-type(2)": { alignSelf: "center", mt: 0 },
        "& .MuiTypography-root": { whiteSpace: "nowrap", overflow: "visible", textOverflow: "clip" },
        "& .MuiChip-root": { maxWidth: "none" },
      }}>
        <RouteBlock job={job} />
        <CargoBlock job={job} />
        <ScheduleBlock job={job} />
        <DriverBlock job={job} />
        <SiteCodesBlock job={job} busy={busy} run={run} />
      </Box>
      </Box>
    </Paper>
  );
}
