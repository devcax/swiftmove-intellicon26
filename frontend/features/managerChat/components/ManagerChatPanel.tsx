"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useManagerChat } from "../hooks/useManagerChat";
import { ChatHistory } from "./ChatHistory";
import { ChatConversation } from "./ChatConversation";
import { ChatSettings } from "./ChatSettings";

export function ManagerChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const chat = useManagerChat(open);
  const [tab, setTab] = useState<"chat" | "settings">("chat");
  const [view, setView] = useState<"history" | "conversation">("history");
  return <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 360, maxWidth: "100vw", display: "flex", flexDirection: "column" } } }}>
    <Tabs value={tab} onChange={(_, next: "chat" | "settings") => setTab(next)} variant="fullWidth" aria-label="Assistant sections" sx={{ bgcolor: "#eef2ff", borderBottom: "1px solid #e2e8f0", flexShrink: 0, "& .MuiTab-root": { textTransform: "none", fontSize: 13, fontWeight: 600 }, "& .MuiTabs-indicator": { bgcolor: "#1e3a8a" } }}>
      <Tab value="chat" label="Chat" id="assistant-tab-chat" aria-controls="assistant-panel-chat" /><Tab value="settings" label="Settings" id="assistant-tab-settings" aria-controls="assistant-panel-settings" />
    </Tabs>
    {chat.managementError && <Alert severity="error" onClose={chat.dismissError} action={<Button color="inherit" size="small" onClick={() => { chat.dismissError(); void chat.refresh(); }}>Retry</Button>} sx={{ m: 1 }}>{chat.managementError}</Alert>}
    <Box role="tabpanel" id={`assistant-panel-${tab}`} aria-labelledby={`assistant-tab-${tab}`} sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      {tab === "settings" ? <ChatSettings key={chat.activeId ?? "draft"} chat={chat} /> : view === "history" ?
        <ChatHistory chat={chat} onOpen={id => { void chat.select(id); setView("conversation"); }} onNew={() => { chat.newChat(); setView("conversation"); }} /> :
        <ChatConversation key={chat.activeId ?? "draft"} chat={chat} onBack={() => setView("history")} />}
    </Box>
  </Drawer>;
}
