"use client";

import Typography from "@mui/material/Typography";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

/** Shown when no conversation is open. */
export function NoConversationSelected() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#f8fafc] text-center">
      <AutoAwesomeRoundedIcon sx={{ fontSize: 44, color: "#cbd5e1" }} />
      <Typography variant="h6" sx={{ color: "#64748b" }}>
        Select a conversation
      </Typography>
      <Typography variant="body2" sx={{ color: "#94a3b8", maxWidth: 320 }}>
        Pick a driver thread to see their WhatsApp messages, AI interpretations and send manual replies.
      </Typography>
    </div>

  );
}
