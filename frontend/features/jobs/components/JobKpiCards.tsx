"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { cardHint, cardLabel, tabs } from "../constants";
import type { JobStatus } from "../types";

const appearances = [
  { color: "#1e3a8a", icon: <Inventory2OutlinedIcon /> },
  { color: "#0369a1", icon: <PublishRoundedIcon /> },
  { color: "#0f766e", icon: <LocalShippingOutlinedIcon /> },
  { color: "#6d28d9", icon: <TaskAltRoundedIcon /> },
  { color: "#be123c", icon: <BlockRoundedIcon /> },
];

export function JobKpiCards({ tab, onTab, countFor, loading = false }: {
  tab: "ALL" | JobStatus; onTab: (tab: "ALL" | JobStatus) => void; countFor: (tab: "ALL" | JobStatus) => number; loading?: boolean;
}) {
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)", xl: "repeat(5, 1fr)" }, gap: 2.5, mb: 3 }}>
    {tabs.map((value, index) => {
      const appearance = appearances[index];
      const selected = tab === value;
      return <ButtonBase key={value} onClick={() => onTab(value)} aria-pressed={selected} aria-label={`Filter: ${cardLabel[value]}`}
        sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 1.5, textAlign: "left", p: 2, borderRadius: 1.5, minHeight: 126,
          bgcolor: selected ? appearance.color : "#fff", color: selected ? "#fff" : "#334155", outline: "none",
          outlineOffset: 2, "&:hover": { color: selected ? "#fff" : appearance.color }, "&.Mui-focusVisible": { outline: `2px solid ${appearance.color}`, outlineOffset: 3 } }}>
        <Box aria-hidden="true" sx={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: selected ? "rgba(255,255,255,0.16)" : "#f1f5f9", color: selected ? "#fff" : appearance.color }}>{appearance.icon}</Box>
        <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 12, fontWeight: 600 }}>{cardLabel[value]}</Typography><Typography sx={{ fontSize: 27, lineHeight: 1.4, fontWeight: 700 }}>{loading ? "—" : countFor(value)}</Typography><Typography sx={{ fontSize: 11, color: selected ? "#fff" : "#64748b" }}>{cardHint[value].text}</Typography></Box>
      </ButtonBase>;
    })}
  </Box>;
}
