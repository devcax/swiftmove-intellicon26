"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { workspaceTabsSx } from "@/shared/styles/workspaceTabs";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useFlowEditor, type LoadedFlowEditor } from "../hooks/useFlowEditor";
import type { ApiFlowMeta } from "../types";
import { AiDraftDialog } from "./AiDraftDialog";
import { FlowIssues } from "./FlowIssues";
import { FlowMetaFields } from "./FlowMetaFields";
import { FlowCanvasBuilder } from "./FlowCanvasBuilder";
import FlowSimulator from "./FlowSimulator";
import { FlowVersionBar } from "./FlowVersionBar";
import { FlowVersionsMenu } from "./FlowVersionsMenu";

interface FlowEditorViewProps {
  flowKey: string;
  meta: ApiFlowMeta;
  onBack: () => void;
  onChanged: () => void;
  notify: (message: string) => void;
  notifyError: (message: string) => void;
  embedded?: boolean;
}

/** One visual workspace for building, configuring, and testing a conversation. */
export function FlowEditorView({ flowKey, meta, onBack, onChanged, notify, notifyError, embedded = false }: FlowEditorViewProps) {
  const [section, setSection] = React.useState(0);
  const editor = useFlowEditor({ flowKey, meta, onBack, onChanged, notify, notifyError });
  if (editor.error) return <Alert severity="error">{editor.error}</Alert>;
  if (!editor.detail || !editor.working) return <Typography color="text.secondary">Loading flow...</Typography>;
  const loaded = editor as LoadedFlowEditor;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FlowVersionBar editor={loaded} onBack={onBack} embedded={embedded} />
      <Tabs value={section} onChange={(_, next: number) => setSection(next)} variant="fullWidth" aria-label="Conversation editor sections" sx={{
        ...workspaceTabsSx, mb: 0, width: "100%", border: "1px solid #e2e8f0", borderRadius: 1,
        "& .MuiTab-root": { ...workspaceTabsSx["& .MuiTab-root"], border: 0, borderRight: "1px solid #e2e8f0", px: { xs: 1, sm: 2.5 }, fontSize: { xs: 11, sm: 12.5 }, "&:last-of-type": { borderRight: 0 } },
      }}>
        <Tab label="Flow builder" /><Tab label="Flow settings" /><Tab label="Simulator" />
      </Tabs>
      {section === 1 && <FlowMetaFields editor={loaded} meta={meta} />}
      <FlowIssues editor={loaded} />
      <Box sx={{ display: section === 0 ? "block" : "none", minWidth: 0 }}>
        <FlowCanvasBuilder editor={loaded} meta={meta} />
      </Box>
      {section === 2 && <Box sx={{ display: "flex", flexDirection: "column", height: 620, minHeight: 480 }}>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>{loaded.dirty ? "Save your draft first to test the latest canvas changes." : "Test a saved version. No WhatsApp messages are sent and real jobs stay unchanged."}</Alert>
        <FlowSimulator flowKey={flowKey} versions={loaded.detail.versions} onError={notifyError} />
      </Box>}
      <FlowVersionsMenu editor={loaded} />
      {loaded.aiDraftOpen && (
        <AiDraftDialog
          base={loaded.working.definition}
          onClose={() => loaded.setAiDraftOpen(false)}
          onApply={(definition) => {
            loaded.patchDefinition(definition, undefined, {});
            loaded.setAiDraftOpen(false);
            notify("AI draft applied to the canvas. Review the steps, then save your draft and test it.");
          }}
          onError={notifyError}
        />
      )}
      <ConfirmDialog confirm={loaded.confirm} onClose={() => loaded.setConfirm(null)} />
    </Box>
  );
}
