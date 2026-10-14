"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import FlowGraph from "./FlowGraph";
import FlowSimulator from "./FlowSimulator";
import type { LoadedFlowEditor } from "../hooks/useFlowEditor";

/** The graph of the flow and the simulator that runs it. */
export function FlowPreviewPanel({ editor, flowKey, notifyError, embedded = false }: { editor: LoadedFlowEditor; flowKey: string; notifyError: (message: string) => void; embedded?: boolean }) {
  const { detail, dirty, rightTab, selectedStepId, setRightTab, setSelectedStepId, working } = editor;
  return (
    <>
    {/* right: graph + simulator */}
    <Box sx={{ position: embedded ? "static" : { lg: "sticky" }, top: { lg: 76 }, display: "flex", flexDirection: "column", height: embedded ? 560 : { lg: "calc(100vh - 110px)" }, minHeight: 480 }}>
      <Tabs value={rightTab} onChange={(_e, next) => setRightTab(next)} aria-label="Flow preview mode" sx={{
        mb: 2, minHeight: 36, width: "fit-content", maxWidth: "100%", flexShrink: 0,
        "& .MuiTabs-indicator": { display: "none" },
        "& .MuiTabs-list": { gap: 1 },
        "& .MuiTab-root": { minHeight: 36, px: 2, py: 0.75, borderRadius: 1.5, bgcolor: "#f1f5f9", color: "#64748b", fontSize: 12, fontWeight: 600, textTransform: "none" },
        "& .MuiTab-root.Mui-selected": { bgcolor: "#1e3a8a", color: "#fff" },
      }}>
        <Tab label="Graph preview" />
        <Tab label="Simulator" />
      </Tabs>
      <Box sx={{ flex: 1, minHeight: 0, display: rightTab === 0 ? "block" : "none" }}>
        <FlowGraph definition={working.definition} selectedId={selectedStepId} onSelect={setSelectedStepId} />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, display: rightTab === 1 ? "flex" : "none", flexDirection: "column" }}>
        <Alert severity="info" variant="outlined" sx={{ mb: 1, borderRadius: 2 }} icon={false}>
          <Typography variant="caption">
            Dry-runs a saved version — {dirty ? "save your draft first to test the latest edits." : "nothing here touches WhatsApp or real jobs."}
          </Typography>
        </Alert>
        <FlowSimulator flowKey={flowKey} versions={detail.versions} onError={notifyError} />
      </Box>
    </Box>
    </>
  );
}
