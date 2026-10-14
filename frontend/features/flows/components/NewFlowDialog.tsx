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
import { FlowApiError, createFlow, generateFlowDraft } from "@/features/flows/api";
import type { ApiFlowDefinition, ApiFlowMeta } from "@/features/flows/types";
import { slugify, topicIsValid } from "@/features/flows/model";
import * as React from "react";
import { StarterPicker, ownerOf } from "./StarterPicker";

const BLANK: ApiFlowDefinition = {
  steps: [
    { id: "hello", type: "SAY", text: "Hello! How can I help you today?", next: "end" },
    { id: "end", type: "END" },
  ],
};

/** The technical name is made from the name; the manager never has to think of one. */
const keyFrom = (name: string, suffix = "") => `${slugify(name, 48) || "conversation"}${suffix}`.slice(0, 60);

export function NewFlowDialog({
  meta,
  onClose,
  onCreated,
  onError,
}: {
  meta: ApiFlowMeta;
  onClose: () => void;
  onCreated: (key: string) => void;
  onError: (message: string) => void;
}) {
  const firstFree = meta.starters.find((s) => !s.exclusive || s.owners.length === 0)?.id ?? meta.starters[0]?.id ?? "";
  const [name, setName] = React.useState("");
  const [intent, setIntent] = React.useState(firstFree);
  const [topic, setTopic] = React.useState("");
  const [aiDescription, setAiDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [issues, setIssues] = React.useState<string[]>([]);

  const starter = meta.starters.find((s) => s.id === intent);
  const taken = ownerOf(starter, topic, undefined);
  const topicValid = topicIsValid(slugify(topic));
  const useAi = aiDescription.trim().length >= 10;

  const submit = async () => {
    setSaving(true);
    setIssues([]);
    try {
      let definition = BLANK;
      let aiSummary: string | undefined;
      if (useAi) {
        // The AI drafts the steps; the server checks them before we ever see them.
        const draft = await generateFlowDraft({ description: aiDescription.trim() });
        definition = draft.definition;
        aiSummary = draft.description ?? undefined;
      }
      const triggerConfig = { intent, ...(starter && !starter.exclusive && slugify(topic) ? { topic: slugify(topic) } : {}) };
      const create = (key: string) => createFlow({ key, name: name.trim(), description: aiSummary, triggerType: "INTENT", triggerConfig, definition }).then(() => key);
      let key: string;
      try {
        key = await create(keyFrom(name));
      } catch (err) {
        // The technical name is taken: add something to it and try once more.
        if (err instanceof FlowApiError && /key already exists/i.test(err.message)) key = await create(keyFrom(name, `-${Math.random().toString(36).slice(2, 6)}`));
        else throw err;
      }
      onCreated(key);
    } catch (err) {
      if (err instanceof FlowApiError && err.issues.length > 0) {
        setIssues(err.issues.map((i) => `${i.step ? `${i.step}: ` : ""}${i.message}`));
      } else {
        onError(err instanceof Error ? err.message : "Could not create the conversation.");
      }
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>New conversation</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          A conversation is what the bot says to a driver, step by step. Pick when it should start, then describe it in your own words
          and the AI writes the steps. You can read and change everything before it goes live.
        </Typography>
        <TextField size="small" label="Name" value={name} fullWidth onChange={(e) => setName(e.target.value)} placeholder="e.g. Working hours" />
        <StarterPicker starters={meta.starters} intent={intent} topic={topic} onIntent={setIntent} onTopic={setTopic} />
        <TextField
          size="small" label="What should the bot say? (optional)" value={aiDescription} fullWidth multiline minRows={3}
          placeholder={'e.g. "Tell them the depot is open 6am to 10pm, Sundays are rest days, then ask if they need anything else."'}
          onChange={(e) => setAiDescription(e.target.value)}
          helperText={useAi ? "The AI will write the steps. You review them before publishing." : "Write at least 10 characters and the AI writes it for you. Leave empty to start from a blank conversation."}
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
        <Button variant="contained" onClick={submit} disabled={saving || !name.trim() || !intent || Boolean(taken) || !topicValid}>
          {saving ? (useAi ? "Writing it…" : "Creating…") : useAi ? "Write it & create" : "Create conversation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
