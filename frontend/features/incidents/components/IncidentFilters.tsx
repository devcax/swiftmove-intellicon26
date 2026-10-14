"use client";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { FILTERS } from "../constants";

/** Status navigation shares one segmented strip with a scrollable narrow-screen fallback. */
export function IncidentFilters({ filter, onFilter }: { filter: string; onFilter: (key: string) => void }) {
  return <Tabs value={filter} onChange={(_, value: string) => onFilter(value)} variant="scrollable" scrollButtons="auto" aria-label="Incident status" sx={{
    width: "fit-content", maxWidth: "100%", bgcolor: "#fff", borderRadius: 1.5, p: 0.5, minHeight: 44,
    "& .MuiTabs-indicator": { display: "none" },
    "& .MuiTab-root": { minHeight: 36, minWidth: 0, px: 2, py: 0.75, borderRadius: 1, fontSize: 12.5, fontWeight: 500, textTransform: "none", color: "#64748b" },
    "& .MuiTab-root.Mui-selected": { bgcolor: "#1e3a8a", color: "#fff", fontWeight: 600 },
  }}>{FILTERS.map(item => <Tab key={item.key} value={item.key} label={item.key === "" ? "All status" : item.label} id={`incident-tab-${item.key || "all"}`} aria-controls="incident-table-panel" />)}</Tabs>;
}
