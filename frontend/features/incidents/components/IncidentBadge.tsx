"use client";

import Chip from "@mui/material/Chip";

export function IncidentBadge({ label, tone }: { label: string; tone: { bg: string; fg: string } }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{ bgcolor: tone.bg, color: tone.fg, fontWeight: 700, fontSize: 11, height: 22 }}
    />
  );
}
