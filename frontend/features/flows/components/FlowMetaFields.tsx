"use client";

import Box from "@mui/material/Box";
import { FormTextField as TextField } from "@/shared/components/FormTextField";
import Typography from "@mui/material/Typography";
import type { ApiFlowMeta } from "@/features/flows/types";
import type { LoadedFlowEditor } from "../hooks/useFlowEditor";
import { StarterPicker } from "./StarterPicker";

/** Name, description and what starts it (editable for a conversation you made, shown as words for a built-in one). */
export function FlowMetaFields({ editor, meta }: { editor: LoadedFlowEditor; meta: ApiFlowMeta }) {
  const { detail, setWorking, working } = editor;
  const editableStarter = working.triggerType === "INTENT" && !detail.isSystem;
  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "1fr 1fr" }, gap: 3 }}>
        <TextField
          size="small" label="Name" value={working.name}
          onChange={(e) => setWorking({ ...working, name: e.target.value })}
          sx={{ minWidth: 0 }}
        />
        <TextField
          size="small" label="Description" value={working.description} fullWidth
          onChange={(e) => setWorking({ ...working, description: e.target.value })}
        />
      </Box>
      {editableStarter ? (
        <Box sx={{ maxWidth: 560 }}>
          <StarterPicker
            starters={meta.starters} intent={working.intent} topic={working.topic} currentKey={detail.key}
            onIntent={(intent) => setWorking({ ...working, intent })}
            onTopic={(topic) => setWorking({ ...working, topic })}
          />
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          <strong>Starts when:</strong> {detail.startsWhen}
          {detail.isSystem ? " (built-in: this part is fixed, the steps below are yours to change)" : ""}
        </Typography>
      )}
    </>
  );
}
