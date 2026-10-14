"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { FormTextField } from "@/shared/components/FormTextField";
import type { ManagerChat } from "../hooks/useManagerChat";

export function ChatSettings({ chat }: { chat: ManagerChat }) {
  const [value, setValue] = useState(String(chat.contextMessages));
  const [seen, setSeen] = useState(chat.contextMessages);
  if (seen !== chat.contextMessages) { setSeen(chat.contextMessages); setValue(String(chat.contextMessages)); }
  const [saving, setSaving] = useState(false);
  const number = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(number) && number >= chat.limits.min && number <= chat.limits.max;
  return <Box className="panel-scroll" sx={{ p: 3, minHeight: 0, overflowY: "auto" }}>
    <Box component="form" onSubmit={async event => { event.preventDefault(); if (!valid) return; setSaving(true); try { await chat.changeContext(number); } finally { setSaving(false); } }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>Chat context limit</Typography>
      <FormTextField label="Messages remembered" type="number" value={value} disabled={saving || chat.sending || chat.managing}
        onChange={event => setValue(event.target.value)} error={!valid} helperText={`Choose ${chat.limits.min}–${chat.limits.max} messages. Current limit: ${chat.contextMessages}.`}
        slotProps={{ htmlInput: { min: chat.limits.min, max: chat.limits.max, step: 1 } }} />
      <Typography sx={{ fontSize: 12, color: "#64748b", my: 2, lineHeight: 1.8 }}>The assistant reads this many of the latest messages in this chat. Older messages stay in your history. Each conversation has its own context.</Typography>
      <Button type="submit" variant="contained" disabled={!valid || saving || chat.sending || chat.managing || number === chat.contextMessages}>{saving ? "Saving…" : "Save settings"}</Button>
    </Box>
  </Box>;
}
