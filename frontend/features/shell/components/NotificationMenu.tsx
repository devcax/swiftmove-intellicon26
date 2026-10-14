"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useNotifications } from '@/features/notifications/useNotifications';

export function NotificationMenu() {
  const router = useRouter();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const { inbox, error, busy, markRead } = useNotifications();
  const total = inbox?.unreadCount ?? 0;
  return <>
    <Tooltip title="Notifications">
      <IconButton onClick={event => setAnchor(event.currentTarget)} aria-label={`Notifications, ${total} unread`}
        aria-haspopup="menu" aria-expanded={Boolean(anchor)} sx={{ width: 40, height: 40, color: '#64748b' }}>
        <Badge badgeContent={total} max={99} color="error"><NotificationsNoneRoundedIcon sx={{ fontSize: 23 }} /></Badge>
      </IconButton>
    </Tooltip>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { mt: 1, width: 400, maxWidth: 'calc(100vw - 24px)', maxHeight: 'min(560px, calc(100dvh - 80px))', borderRadius: 2 } }, list: { 'aria-label': 'Notifications', sx: { py: 0 } } }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box><Typography sx={{ fontWeight: 700, fontSize: 15 }}>Notifications</Typography>
          <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.5 }}>Driver messages and incidents</Typography></Box>
        <Button size="small" disabled={!total || busy} onClick={() => void markRead()} sx={{ fontSize: 11, flexShrink: 0 }}>Mark all as read</Button>
      </Box>
      {error && <Box role="status" sx={{ p: 2, color: '#92400e', fontSize: 12 }}>{error}</Box>}
      {!inbox && !error && <Box role="status" sx={{ p: 3, fontSize: 13 }}>Loading notifications…</Box>}
      {inbox?.items.length === 0 && <Box sx={{ p: 3 }}><Typography sx={{ fontSize: 13, fontWeight: 600 }}>No notifications yet</Typography>
        <Typography sx={{ mt: 0.75, fontSize: 12, color: '#475569' }}>New driver messages and incident reports will appear here.</Typography></Box>}
      {inbox?.items.map(item => <MenuItem key={item.id} disabled={busy} onClick={async () => {
        if (!item.readAt && !await markRead(item.id)) return;
        setAnchor(null);
        router.push(item.targetPath);
      }} sx={{ p: 2, gap: 1.5, alignItems: 'flex-start', whiteSpace: 'normal', borderBottom: '1px solid #eef0f4', '&:hover': { bgcolor: 'transparent' } }}>
        <Box sx={{ color: item.notificationType === 'INCIDENT' ? '#b91c1c' : '#1e3a8a', pt: 0.25 }}>
          {item.notificationType === 'INCIDENT' ? <ReportProblemOutlinedIcon /> : <ChatBubbleOutlineRoundedIcon />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: item.readAt ? 500 : 700 }}>{item.title}</Typography>
          <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }}>{item.body}</Typography>
          <Typography component="time" dateTime={item.createdAt} sx={{ display: 'block', fontSize: 11, color: '#475569', mt: 0.75 }}>{new Date(item.createdAt).toLocaleString()}</Typography>
        </Box>
        {!item.readAt && <Box component="span" aria-label="Unread" sx={{ mt: 0.75, width: 7, height: 7, flexShrink: 0, borderRadius: '50%', bgcolor: '#1e3a8a' }} />}
      </MenuItem>)}
      {Boolean(inbox?.items.length) && <Typography sx={{ p: 1.5, textAlign: 'center', color: '#475569', fontSize: 11 }}>Showing the latest {inbox!.items.length} notifications</Typography>}
    </Menu>
  </>;
}
