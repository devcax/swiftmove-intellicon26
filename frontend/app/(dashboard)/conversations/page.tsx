"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { ChatHeader } from "@/features/conversations/components/ChatHeader";
import { ClearDeleteDialog } from "@/features/conversations/components/ClearDeleteDialog";
import { Composer } from "@/features/conversations/components/Composer";
import { ConversationList } from "@/features/conversations/components/ConversationList";
import { MessageFeed } from "@/features/conversations/components/MessageFeed";
import { NoConversationSelected } from "@/features/conversations/components/NoConversationSelected";
import { useConversations } from "@/features/conversations/hooks/useConversations";
import { DriverChatDetails } from "@/features/conversations/components/DriverChatDetails";

export default function ConversationsPage() {
  return <React.Suspense fallback={<Box role="status" sx={{ p: 3 }}>Loading conversations…</Box>}><ConversationsContent /></React.Suspense>;
}

function ConversationsContent() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const isWide = useMediaQuery(theme.breakpoints.up("xl"));
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const chat = useConversations();
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = React.useState<"clear" | "delete" | null>(null);
  const { active } = chat;
  const draft = chat.activeId ? drafts[chat.activeId] ?? "" : "";

  const send = () => {
    const text = draft.trim();
    if (!text || chat.sending) return;
    if (chat.activeId) setDrafts(all => ({ ...all, [chat.activeId!]: "" }));
    void chat.sendMessage(text);
  };

  const showList = isDesktop || chat.activeId === null;
  const showChat = isDesktop || chat.activeId !== null;

  return (
    <Box sx={{ height: "100%", minHeight: 0, width: "100%", maxWidth: 1500, mx: "auto", px: { xs: 1.5, sm: 2.5 }, py: { xs: 1.5, sm: 2.5 } }}>
    <Paper sx={{ display: "flex", height: "100%", minHeight: 0, overflow: "hidden", borderRadius: 1.5, boxShadow: "0 2px 6px rgba(15,23,42,0.04)" }}>
      <Box sx={{ display: showList ? "flex" : "none", flexDirection: "column", minHeight: 0, width: { xs: "100%", md: 280, xl: 300 } }} className="shrink-0 border-r border-slate-100">
        <ConversationList threads={chat.threads} activeId={chat.activeId} backendError={chat.backendError} onOpen={chat.openThread} />
      </Box>

      {showChat && (
        <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0 }} className="min-w-0 flex-1">
          {active ? (
            <>
              <ChatHeader
                active={active} isDesktop={isDesktop} takeoverPending={chat.takeoverPending}
                onBack={chat.closeThread} onToggleTakeover={() => void chat.toggleTakeover()} onAction={setPendingAction}
                onDetails={!isWide ? () => setDetailsOpen(true) : undefined}
              />
              <ClearDeleteDialog
                action={pendingAction} driver={active.driver} pending={chat.actionPending} onClose={() => setPendingAction(null)}
                onConfirm={() => { if (pendingAction) void chat.confirmAction(pendingAction).then((done) => { if (done) setPendingAction(null); }); }}
              />
              <MessageFeed conversation={active} />
              <Composer draft={draft} onDraft={value => { if (chat.activeId) setDrafts(all => ({ ...all, [chat.activeId!]: value })); }} sending={chat.sending} onSend={send} />
            </>
          ) : (
            <NoConversationSelected />
          )}
        </Box>
      )}
      {active && isWide && <Box sx={{ width: 250, flexShrink: 0, minHeight: 0, borderLeft: "1px solid #eef0f4" }}><DriverChatDetails conversation={active} /></Box>}
    </Paper>
    <Drawer anchor="right" open={detailsOpen && !isWide && Boolean(active)} onClose={() => setDetailsOpen(false)} slotProps={{ paper: { sx: { width: 280, maxWidth: "100vw" } } }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}><IconButton aria-label="Close driver details" onClick={() => setDetailsOpen(false)}><CloseRoundedIcon /></IconButton></Box>
      {active && <DriverChatDetails conversation={active} />}
    </Drawer>
    </Box>
  );
}
