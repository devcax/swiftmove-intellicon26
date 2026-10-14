"use client";
import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { FormTextField } from "@/shared/components/FormTextField";
import type { Conversation } from "../types";
import { initials } from "@/lib/format";

export function ConversationList({ threads, activeId, backendError, onOpen }: { threads: Conversation[]; activeId: string | null; backendError: string | null; onOpen: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const query = search.trim().toLowerCase();
  const visible = threads.filter(thread => (filter === "all" || thread.unread > 0) && [thread.driver, thread.phone, thread.jobNumber, thread.lastMessage].some(value => value.toLowerCase().includes(query)));
  const unread = threads.filter(thread => thread.unread > 0).length;
  return <>
    <Box sx={{ p: 2, flexShrink: 0 }}>
      <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700, mb: 1.5 }}>Driver chats</Typography>
      <FormTextField placeholder="Search driver, number, or job" value={search} onChange={event => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': 'Search driver conversations' } }} />
      <ToggleButtonGroup value={filter} exclusive onChange={(_, next: string | null) => next && setFilter(next)} size="small" aria-label="Filter conversations" sx={{ mt: 1.5, bgcolor: "#f3f4f6", p: 0.5, borderRadius: 1, "& .MuiToggleButton-root": { border: 0, borderRadius: "6px !important", textTransform: "none", fontSize: 11.5, px: 1.5, py: 0.5 }, "& .MuiToggleButton-root.Mui-selected": { bgcolor: "#fff", color: "#1e3a8a", fontWeight: 600 } }}>
        <ToggleButton value="all">All chats {threads.length}</ToggleButton><ToggleButton value="unread">Unread {unread}</ToggleButton>
      </ToggleButtonGroup>
    </Box>
    {backendError && <Typography role="alert" sx={{ px: 2, py: 1, color: "#b45309", bgcolor: "#fffbeb", fontSize: 11.5 }}>{backendError}</Typography>}
    <List className="panel-scroll" disablePadding sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1, pb: 1 }}>
      {visible.length === 0 && !backendError && <Typography sx={{ px: 2, py: 6, color: "#64748b", textAlign: "center", fontSize: 12 }}>{threads.length === 0 ? "Conversations appear when a registered driver messages your WhatsApp number." : "No conversations match this filter."}</Typography>}
      {visible.map(thread => {
        const selected = thread.id === activeId;
        return <ListItemButton key={thread.id} selected={selected} onClick={() => onOpen(thread.id)} sx={{ borderRadius: 1, mb: 0.75, p: 1.5, gap: 1.25, alignItems: "center", "&.Mui-selected": { bgcolor: "#1e3a8a", color: "#fff", "&:hover": { bgcolor: "#1e40af" } } }}>
          <Avatar sx={{ width: 38, height: 38, fontSize: 12, fontWeight: 600, bgcolor: selected ? "#ffffff26" : "#eef2ff", color: selected ? "#fff" : "#1e3a8a" }}>{initials(thread.driver)}</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600 }}>{thread.driver}</Typography>
            <Typography noWrap sx={{ fontSize: 11, mt: 0.5, color: selected ? "#dbeafe" : "#64748b" }}>{thread.lastMessage || "No messages yet"}</Typography>
            <Typography noWrap sx={{ fontSize: 10, mt: 0.5, color: selected ? "#dbeafe" : "#1e3a8a" }}>{thread.jobNumber}</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 9.5, color: selected ? "#dbeafe" : "#64748b" }}>{thread.lastActivity}</Typography>
            {thread.unread > 0 && <Box component="span" sx={{ borderRadius: "50%", minWidth: 18, height: 18, px: 0.5, bgcolor: selected ? "#fff" : "#1e3a8a", color: selected ? "#1e3a8a" : "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{thread.unread}</Box>}
          </Box>
        </ListItemButton>;
      })}
    </List>
  </>;
}
