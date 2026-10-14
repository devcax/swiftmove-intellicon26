"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PlaylistRemoveRoundedIcon from "@mui/icons-material/PlaylistRemoveRounded";
import { ConfirmDialog, type Confirmation } from "@/shared/components/ConfirmDialog";
import type { ManagerChat } from "../hooks/useManagerChat";

export function ChatToolbar({ chat, onBack }: { chat: ManagerChat; onBack: () => void }) {
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  return <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderBottom: "1px solid #eef0f4", flexShrink: 0 }}>
    <IconButton onClick={onBack} aria-label="Back to past chats"><ArrowBackRoundedIcon fontSize="small" /></IconButton>
    <Box sx={{ minWidth: 0, flex: 1 }}><Typography noWrap sx={{ fontSize: 14, fontWeight: 700 }}>{chat.active?.title ?? "New chat"}</Typography><Typography sx={{ color: "#64748b", fontSize: 11 }}>Operations assistant</Typography></Box>
    <IconButton disabled={chat.sending || chat.managing || chat.entries.length === 0} aria-label="Clear conversation" onClick={() => setConfirm({ title: "Clear this chat?", body: "Remove the messages and context while keeping this chat.", action: chat.clear })}><PlaylistRemoveRoundedIcon fontSize="small" /></IconButton>
    <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
  </Box>;
}
