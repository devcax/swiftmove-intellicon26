"use client";

import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

const tones = {
  info: { bg: "#edf2fc", fg: "#1e3a8a" },
  success: { bg: "#e8f7ee", fg: "#15803d" },
  warning: { bg: "#fff4e5", fg: "#92400e" },
  danger: { bg: "#feecef", fg: "#be123c" },
  neutral: { bg: "#f1f5f9", fg: "#475569" },
};

/** Compact, labeled row action with the same icon treatment across tables. */
export function TableActionButton({ label, icon, onClick, tone = "info", disabled = false }: {
  label: string; icon: ReactNode; onClick: () => void; tone?: keyof typeof tones; disabled?: boolean;
}) {
  const colors = tones[tone];
  return <Tooltip title={label}><span><IconButton aria-label={label} onClick={onClick} disabled={disabled}
    sx={{ width: 32, height: 32, bgcolor: colors.bg, color: colors.fg, "&:hover": { bgcolor: colors.bg, filter: "brightness(0.95)" }, "& .MuiSvgIcon-root": { fontSize: 17 } }}>{icon}</IconButton></span></Tooltip>;
}
