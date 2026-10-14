"use client";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ApiFlowStarter } from "@/features/flows/types";
import { slugify } from "@/features/flows/model";

/** The conversation, other than the one being edited, that already starts on this (and topic, for general questions). */
export function ownerOf(starter: ApiFlowStarter | undefined, topicText: string, currentKey?: string) {
  if (!starter) return null;
  const topic = slugify(topicText) || null;
  const owners = starter.owners.filter((o) => o.key !== currentKey);
  return (starter.exclusive ? owners[0] : owners.find((o) => o.topic === topic)) ?? null;
}

/**
 * "When should this conversation start?": what a driver can say, in plain words. Each thing can start only one conversation, so the ones
 * already taken are greyed out and say which conversation has them. General questions are the exception: one per topic.
 */
export function StarterPicker({
  starters, intent, topic, currentKey, onIntent, onTopic,
}: {
  starters: ApiFlowStarter[];
  intent: string;
  topic: string;
  currentKey?: string;
  onIntent: (intent: string) => void;
  onTopic: (topic: string) => void;
}) {
  const chosen = starters.find((s) => s.id === intent);
  const taken = ownerOf(chosen, topic, currentKey);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <TextField
        select size="small" label="When the driver…" value={intent} fullWidth
        onChange={(e) => onIntent(e.target.value)}
        error={Boolean(taken)}
        helperText={taken ? `"${taken.name}" already starts on this. Edit that one, or choose something else.` : chosen?.hint || " "}
      >
        {starters.map((s) => {
          const owner = s.exclusive ? s.owners.find((o) => o.key !== currentKey) : null;
          return (
            <MenuItem key={s.id} value={s.id} disabled={Boolean(owner)} sx={{ display: "block" }}>
              <Typography variant="body2">{s.label}</Typography>
              {owner && <Typography variant="caption" color="text.secondary">Already used by “{owner.name}”</Typography>}
            </MenuItem>
          );
        })}
      </TextField>
      {chosen && !chosen.exclusive && (
        <TextField
          size="small" label="About what? (optional)" value={topic} fullWidth
          placeholder="e.g. working hours"
          onChange={(e) => onTopic(e.target.value)}
          error={Boolean(taken)}
          helperText="Each general-question conversation covers one topic. Leave it empty to answer every question no topic covers."
        />
      )}
    </Box>
  );
}
