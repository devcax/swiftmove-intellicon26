"use client";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { FormTextField } from "@/shared/components/FormTextField";

/** Real WhatsApp reply controls, kept on one row as the message grows. */
export function Composer({ draft, onDraft, sending, onSend }: { draft: string; onDraft: (text: string) => void; sending: boolean; onSend: () => void }) {
  return <Box component="form" onSubmit={event => { event.preventDefault(); onSend(); }} sx={{ flexShrink: 0, borderTop: "1px solid #eef0f4", p: 2, bgcolor: "#fff" }}>
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 40px", gap: 1.5, alignItems: "center" }}>
      <FormTextField multiline maxRows={4} placeholder="Write a reply to the driver…" value={draft} disabled={sending}
        onChange={event => onDraft(event.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Reply to driver' } }}
        onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); onSend(); } }}
        sx={{ minWidth: 0, "& .MuiOutlinedInput-root": { bgcolor: "#f8fafc" } }} />
      <IconButton type="submit" aria-label="Send WhatsApp reply" disabled={!draft.trim() || sending} sx={{ width: 40, height: 40, bgcolor: "#1e3a8a", color: "#fff", "&:hover": { bgcolor: "#1e40af" }, "&.Mui-disabled": { bgcolor: "#e2e8f0" } }}><SendRoundedIcon fontSize="small" /></IconButton>
    </Box>
    <Typography sx={{ mt: 0.75, fontSize: 10, color: "#64748b" }}>{sending ? "Sending…" : "Replying as manager via WhatsApp · Shift + Enter for a new line"}</Typography>
  </Box>;
}
