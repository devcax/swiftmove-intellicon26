"use client";

import type { ReactNode } from "react";
import Paper from "@mui/material/Paper";

/** Bounded detail panels keep their heading visible while their body scrolls. */
export function JobDetailPanel({ children }: { children: ReactNode }) {
  return <Paper sx={{
    height: { xs: 440, sm: 520 }, minHeight: 0, minWidth: 0, flexShrink: 0,
    display: "flex", flexDirection: "column", overflow: "hidden", p: 2.5,
    borderRadius: 2.5, border: "1px solid", borderColor: "divider",
    "& > .panel-scroll[role='region']": {
      marginInlineEnd: -1.5,
      paddingInlineEnd: 3,
    },
  }}>{children}</Paper>;
}
