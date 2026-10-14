"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import Collapse from "@mui/material/Collapse";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { FormTextField } from "@/shared/components/FormTextField";
import { ConfirmDialog, type Confirmation } from "@/shared/components/ConfirmDialog";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import type { ManagerChat } from "../hooks/useManagerChat";

export function ChatHistory({ chat, onOpen, onNew }: { chat: ManagerChat; onOpen: (id: string) => void; onNew: () => void }) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const disabled = chat.sending || chat.managing;
  const filtered = chat.chats.filter(item => (item.title ?? "Untitled chat").toLowerCase().includes(search.trim().toLowerCase()));
  return <>
    <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #eef0f4" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton size="small" aria-label="New chat" onClick={onNew} disabled={disabled} sx={{ width: 32, height: 32, bgcolor: "#f3f4f6", borderRadius: 1 }}><AddRoundedIcon fontSize="small" /></IconButton>
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700 }}>AI assistant</Typography>
          <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.25 }}>Your chats</Typography>
        </Box>
        <IconButton size="small" aria-label={searchOpen ? "Close chat search" : "Search chats"} aria-expanded={searchOpen} aria-controls="assistant-chat-search" onClick={() => { setSearchOpen(value => !value); setSearch(""); }} sx={{ width: 32, height: 32, bgcolor: "#f3f4f6", borderRadius: 1 }}>{searchOpen ? <CloseRoundedIcon fontSize="small" /> : <SearchRoundedIcon fontSize="small" />}</IconButton>
      </Box>
      <Collapse in={searchOpen} mountOnEnter unmountOnExit timeout={150}>
        <Box id="assistant-chat-search" sx={{ pt: 1.5 }}>
          <FormTextField autoFocus placeholder="Search chats" value={search} onChange={event => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': 'Search saved chats' } }} />
        </Box>
      </Collapse>
    </Box>
    <Box className="panel-scroll" sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      {chat.loadingChats && chat.chats.length === 0 ? <SectionPreloader label="Loading chats…" /> : filtered.length === 0 ? <Box sx={{ py: 7, px: 3, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{search ? "No matching chats" : "Start your first conversation"}</Typography>
        <Typography sx={{ mt: 1, color: "#64748b", fontSize: 12 }}>{search ? "Try another chat name." : "Create a chat to ask questions or manage your operations."}</Typography>
      </Box> : filtered.map(item => <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 2, py: 1.5, borderBottom: "1px solid #eef0f4", bgcolor: chat.activeId === item.id ? "#f8fafc" : "#fff" }}>
        {editing === item.id ? <Box component="form" sx={{ display: "flex", flex: 1, alignItems: "center", gap: 0.5 }} onSubmit={async event => { event.preventDefault(); if (await chat.rename(item.id, title)) setEditing(null); }}>
          <FormTextField autoFocus value={title} disabled={disabled} onChange={event => setTitle(event.target.value)} slotProps={{ htmlInput: { maxLength: 60, 'aria-label': 'Chat name' } }} />
          <IconButton type="submit" disabled={disabled || !title.trim()} aria-label="Save chat name" color="primary"><CheckRoundedIcon fontSize="small" /></IconButton>
          <IconButton disabled={disabled} onClick={() => setEditing(null)} aria-label="Cancel rename"><CloseRoundedIcon fontSize="small" /></IconButton>
        </Box> : <>
          <Button onClick={() => onOpen(item.id)} disabled={disabled} sx={{ minWidth: 0, flex: 1, display: "block", textAlign: "left", p: 0.5, textTransform: "none", color: "#0f172a" }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>{item.title ?? "Untitled chat"}</Typography>
            <Typography sx={{ fontSize: 11, color: "#64748b", mt: 0.5 }}>{new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</Typography>
          </Button>
          <IconButton size="small" disabled={disabled} aria-label={`Rename ${item.title ?? "chat"}`} onClick={() => { setEditing(item.id); setTitle(item.title ?? ""); }} sx={{ bgcolor: "#eef2ff", color: "#1e3a8a", mr: 0.5 }}><EditOutlinedIcon fontSize="small" /></IconButton>
          <IconButton size="small" disabled={disabled} aria-label={`Delete ${item.title ?? "chat"}`} onClick={() => setConfirm({ title: "Delete this chat?", body: "The chat and its messages will be removed. Actions already completed by the assistant remain.", action: () => chat.remove(item.id) })} sx={{ bgcolor: "#fff1f2", color: "#be123c" }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
        </>}
      </Box>)}
    </Box>
    <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
  </>;
}
