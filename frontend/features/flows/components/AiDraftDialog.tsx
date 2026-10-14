"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FlowApiError, generateFlowDraft } from "@/features/flows/api";
import type { ApiFlowDefinition } from "@/features/flows/types";
import * as React from "react";
import { feedback } from "@/shared/feedback/store";

export function AiDraftDialog({
  base,
  onClose,
  onApply,
  onError,
}: {
  base: ApiFlowDefinition;
  onClose: () => void;
  onApply: (definition: ApiFlowDefinition) => void;
  onError: (message: string) => void;
}) {
  const [instruction, setInstruction] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [issues, setIssues] = React.useState<string[]>([]);

  const canGenerate = instruction.trim().length >= 10;

  const generate = async () => {
    setBusy(true);
    setIssues([]);
    try {
      const draft = await generateFlowDraft({ description: instruction.trim(), base });
      onApply(draft.definition);
    } catch (err) {
      if (err instanceof FlowApiError && err.issues.length > 0) {
        feedback.error("The AI draft has validation issues. Review the details below.");
        setIssues(err.issues.map((i) => `${i.step ? `${i.step}: ` : ""}${i.message}`));
      } else {
        onError(err instanceof Error ? err.message : "The AI draft failed.");
      }
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>Redraft with AI</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Describe the change in plain words. The AI updates the steps of the working copy —
          nothing is saved until you save or publish, and you can review the result in the
          graph and simulator first.
        </Typography>
        <TextField
          size="small" label="What should change?" value={instruction} fullWidth
          multiline minRows={3} autoFocus
          placeholder={'e.g. "Add a weather-problem option to the cancel reasons that goes straight to submitting, same as the others."'}
          onChange={(e) => setInstruction(e.target.value)}
          helperText="At least 10 characters."
        />
        {issues.length > 0 && (
          <Alert severity="error">
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {issues.map((issue, i) => (
                <li key={i}><Typography variant="caption">{issue}</Typography></li>
              ))}
            </Box>
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={generate} disabled={busy || !canGenerate}>
          {busy ? "Drafting…" : "Generate updated draft"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
