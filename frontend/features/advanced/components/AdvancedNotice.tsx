import Alert from "@mui/material/Alert";

/** Guidance shared by the instruction list and editor. */
export function AdvancedNotice() {
  return <Alert severity="warning" sx={{ fontSize: 12.5 }}>
    These instructions control how AI reads driver messages, classifies photos, replies, and drafts flows and rules.
    Changes affect new messages. Use Policies and Bot Conversations for everyday workflow changes.
  </Alert>;
}
