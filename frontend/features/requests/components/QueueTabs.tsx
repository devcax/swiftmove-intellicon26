"use client";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import type { QueueTab } from "../types";

interface QueueTabsProps {
  activeTab: QueueTab; onChange: (tab: QueueTab) => void;
  pendingCount: number; cancelCount: number; closureCount: number; historyCount: number;
}

export function QueueTabs({ activeTab, onChange, pendingCount, cancelCount, closureCount, historyCount }: QueueTabsProps) {
  return <Tabs value={activeTab} onChange={(_, value: QueueTab) => onChange(value)} variant="scrollable" scrollButtons="auto" aria-label="Request queues" sx={{
    bgcolor: "#f3f4f6", borderRadius: 1.5, p: 0.5, minHeight: 44, width: "fit-content", maxWidth: "100%",
    "& .MuiTabs-indicator": { display: "none" },
    "& .MuiTab-root": { minHeight: 36, px: 2, py: 0.75, borderRadius: 1, textTransform: "none", fontSize: 12.5, fontWeight: 600, color: "#64748b" },
    "& .MuiTab-root.Mui-selected": { bgcolor: "#1e3a8a", color: "#fff" },
  }}>{([
    ["requests", "Job requests", pendingCount], ["cancellations", "Cancellations", cancelCount],
    ["closures", "Closures", closureCount], ["history", "History", historyCount],
  ] as const).map(([value, label, count]) => <Tab key={value} id={`queue-tab-${value}`} aria-controls={`queue-panel-${value}`} value={value} label={<span className="flex items-center gap-2">{label}<span className="rounded-full bg-current/10 px-1.5 text-[11px]">{count}</span></span>} />)}</Tabs>;
}
