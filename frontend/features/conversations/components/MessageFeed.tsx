"use client";

import * as React from "react";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import { initials } from "@/lib/format";
import type { Conversation } from "../types";
import { MessageBubble } from "./MessageBubbles";

/** The messages of the open thread, scrolled to the newest. */
export function MessageFeed({ conversation }: { conversation: Conversation }) {
  const feedRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [conversation.id, conversation.messages.length]);
  return (
    <div ref={feedRef} className="panel-scroll min-h-0 flex-1 space-y-5 overflow-y-auto bg-white px-4 py-5 sm:px-6" role="log" aria-label={`Messages with ${conversation.driver}`}>
      {conversation.messages.length === 0 && (
        <Typography variant="body2" sx={{ color: "#94a3b8", textAlign: "center", py: 6 }}>
          No messages in this conversation yet.
        </Typography>
      )}
      {conversation.messages.map((message) => (
        <Box key={message.clientId ?? message.id} sx={{ display: "flex", flexDirection: message.kind === "DRIVER" ? "row" : "row-reverse", alignItems: "flex-start", gap: 1 }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 9, bgcolor: message.kind === "DRIVER" ? "#eef2ff" : "#f1f5f9", color: "#1e3a8a", mt: 0.5 }}>{message.kind === "DRIVER" ? initials(conversation.driver) : message.kind === "MANAGER" ? "You" : <SmartToyRoundedIcon sx={{ fontSize: 15 }} />}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}><MessageBubble message={message} /></Box>
        </Box>
      ))}
    </div>
  );
}
