"use client";
import { useEffect, useRef, useState, Fragment } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { FormTextField } from "@/shared/components/FormTextField";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import type { ChatEntry, ManagerChat } from "../hooks/useManagerChat";
import { BlockedCard } from "./BlockedCard";
import { ConfirmCard } from "./ConfirmCard";
import { ChatToolbar } from "./ChatToolbar";

function EntryView({ entry, chat }: { entry: ChatEntry; chat: ManagerChat }) {
  switch (entry.kind) {
    case "user":
    case "assistant": {
      const mine = entry.kind === "user";
      return <Box sx={{ display: "flex", alignItems: "flex-start", flexDirection: mine ? "row-reverse" : "row", gap: 1 }}>
        <Avatar sx={{ width: 26, height: 26, fontSize: 9, bgcolor: mine ? "#eef2ff" : "#f1f5f9", color: "#1e3a8a", mt: 0.5 }}>{mine ? "You" : <AutoAwesomeRoundedIcon sx={{ fontSize: 14 }} />}</Avatar>
        <Box sx={{ maxWidth: "85%", px: 1.75, py: 1.25, borderRadius: 2, bgcolor: mine ? "#1e3a8a" : "#f1f5f9", color: mine ? "#fff" : "#0f172a", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13, lineHeight: 1.7 }}>{entry.text}</Box>
      </Box>;
    }
    case "activity": return <Typography sx={{ color: entry.outcome === "ok" ? "#15803d" : "#64748b", fontSize: 11, px: 4 }}>• {entry.text}</Typography>;
    case "blocked": return <BlockedCard blocked={entry.blocked} resolved={entry.resolved} disabled={chat.sending} onRetry={chat.send} />;
    case "confirm": return <ConfirmCard entry={entry} onAnswer={decision => void chat.answer(entry.id, decision)} />;
    case "error": return <Alert severity="error">{entry.text}</Alert>;
  }
}

export function ChatConversation({ chat, onBack }: { chat: ManagerChat; onBack: () => void }) {
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement | null>(null);
  const empty = chat.entries.length === 0 && !chat.sending && chat.loadingChat !== chat.activeId;
  const loading = chat.loadingChat !== null && chat.loadingChat === chat.activeId;
  // A draft has no saved id; it is still an empty conversation.
  const initial = chat.entries.length === 0 && !loading && !chat.sending;
  const said = chat.entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.kind === "user" || entry.kind === "assistant");
  const forgottenBefore = said.length > chat.contextMessages ? said[said.length - chat.contextMessages].index : -1;
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [chat.entries, chat.sending]);
  const submit = async () => {
    const text = draft.trim();
    if (!text || chat.sending || loading) return;
    setDraft("");
    if (!await chat.send(text)) setDraft(text);
  };
  const composer = <Box component="form" onSubmit={event => { event.preventDefault(); void submit(); }} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 44px", alignItems: "center", gap: 1, p: 1.5, width: "100%", borderTop: initial ? 0 : "1px solid #eef0f4", flexShrink: 0 }}>
    <FormTextField multiline maxRows={5} placeholder="Ask the assistant…" value={draft} disabled={chat.sending || loading || chat.managing} autoFocus
      sx={{ minWidth: 0, "& .MuiOutlinedInput-root.MuiInputBase-multiline": { minHeight: 48, padding: "12px" } }}
      onChange={event => setDraft(event.target.value.slice(0, 4000))}
      onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }}
      slotProps={{ htmlInput: { 'aria-label': 'Message to the assistant', maxLength: 4000 } }} />
    <IconButton type="submit" disabled={chat.sending || loading || chat.managing || !draft.trim()} aria-label="Send message" sx={{ bgcolor: "#1e3a8a", color: "#fff", width: 44, height: 44, flexShrink: 0, "&:hover": { bgcolor: "#1e40af" } }}><SendRoundedIcon fontSize="small" /></IconButton>
  </Box>;
  return <>
    <ChatToolbar chat={chat} onBack={onBack} />
    {initial ? <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", px: 1.5, pb: 5 }}>
      <AutoAwesomeRoundedIcon sx={{ color: "#1e3a8a", fontSize: 30, alignSelf: "center", mb: 2 }} />
      <Typography sx={{ fontSize: 21, fontWeight: 700, textAlign: "center" }}>How can I help?</Typography>
      <Typography sx={{ color: "#64748b", textAlign: "center", fontSize: 12, mx: 2, mt: 1, mb: 2 }}>Ask about your jobs, drivers, or the next thing that needs attention.</Typography>
      {composer}
    </Box> : <>
      <Box className="panel-scroll" role="log" aria-live="polite" aria-label="Conversation with the assistant" sx={{ display: "flex", flexDirection: "column", gap: 1.5, flex: 1, minHeight: 0, overflowY: "auto", px: 2, py: 2 }}>
        {loading ? <SectionPreloader label="Opening chat…" /> : chat.entries.map((entry, index) => <Fragment key={entry.id}>
          {index === forgottenBefore && <Typography sx={{ color: "#64748b", textAlign: "center", borderTop: "1px dashed #cbd5e1", pt: 1, fontSize: 11 }}>The assistant remembers the messages below this line</Typography>}
          <EntryView entry={entry} chat={chat} />
        </Fragment>)}
        {chat.sending && <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#64748b" }}><CircularProgress size={16} /><Typography sx={{ fontSize: 12 }}>Working on it…</Typography></Box>}
        {empty && <Typography sx={{ fontSize: 12, color: "#64748b" }}>Write a message to continue.</Typography>}
        <div ref={end} />
      </Box>
      {composer}
    </>}
  </>;
}
