/** Attached tabs shared by the policy library and creation workspace. */
export const workspaceTabsSx = {
  mb: 3, minHeight: 44, borderBottom: "1px solid #e2e8f0",
  "& .MuiTabs-indicator": { display: "none" },
  "& .MuiTab-root": {
    minHeight: 44, bgcolor: "#fff", border: "1px solid #e2e8f0", borderBottom: 0,
    px: 2.5, fontSize: 12.5, fontWeight: 500, textTransform: "none", color: "#64748b",
  },
  "& .MuiTab-root.Mui-selected": {
    bgcolor: "#f1f5f9", color: "#1e3a8a", fontWeight: 600, borderTop: "2px solid #1e3a8a",
  },
  "& .MuiTab-icon": { fontSize: 18 },
} as const;
