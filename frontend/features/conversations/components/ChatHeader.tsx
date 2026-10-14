"use client";

import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { type Conversation } from "@/features/conversations/types";
import { initials } from "@/lib/format";
import * as React from "react";

/** Who the thread is with, the take-over button and the actions menu. */
export function ChatHeader({ active, isDesktop, takeoverPending, onBack, onToggleTakeover, onAction, onDetails }: {
  active: Conversation; isDesktop: boolean; takeoverPending: boolean; onBack: () => void; onToggleTakeover: () => void; onAction: (action: "clear" | "delete") => void;
  onDetails?: () => void;
}) {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  return (
              <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
                {!isDesktop && (
                  <IconButton size="small" onClick={() => onBack()} aria-label="Back to driver chats" sx={{ border: "1px solid", borderColor: "primary.main", color: "primary.main", borderRadius: 1 }}>
                    <ArrowBackRoundedIcon fontSize="small" />
                  </IconButton>
                )}
                <Avatar sx={{ width: 36, height: 36, bgcolor: "#eef2ff", color: "#1e3a8a", fontSize: 12, fontWeight: 700 }}>
                  {initials(active.driver)}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Typography variant="subtitle2" noWrap sx={{ fontSize: 14 }}>
                    {active.driver}
                  </Typography>
                  <Typography variant="caption" noWrap component="div" sx={{ color: "text.secondary", fontSize: 11 }}>
                    {active.phone} · {active.jobNumber}
                  </Typography>
                </div>
                {active.verified && isDesktop && (
                  <Chip
                    label="VERIFIED"
                    size="small"
                    sx={{ bgcolor: "#e8f7ee", color: "#15803d", fontWeight: 800, fontSize: 10, letterSpacing: "0.08em" }}
                  />
                )}
                <Button
                  size="small"
                  variant={active.aiPaused ? "contained" : "outlined"}
                  color={active.aiPaused ? "warning" : "primary"}
                  startIcon={
                    active.aiPaused ? (
                      <SmartToyRoundedIcon />
                    ) : (
                      <SupportAgentRoundedIcon />
                    )
                  }
                  disabled={takeoverPending}
                  onClick={() => onToggleTakeover()}
                  sx={{ flexShrink: 0, textTransform: "none" }}
                >
                  {active.aiPaused ? "Resume AI" : "Take over"}
                </Button>
                {onDetails && <IconButton size="small" aria-label="View driver details" onClick={onDetails}><InfoOutlinedIcon fontSize="small" /></IconButton>}
                <Tooltip title="Conversation actions">
                  <IconButton
                    size="small"
                    aria-label="Conversation actions"
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                    sx={{ border: "1px solid #e8edf3" }}
                  >
                    <MoreVertRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      onAction("clear");
                    }}
                  >
                    <ListItemIcon>
                      <DeleteSweepRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    Clear messages
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      onAction("delete");
                    }}
                    sx={{ color: "#dc2626" }}
                  >
                    <ListItemIcon>
                      <DeleteOutlineRoundedIcon fontSize="small" sx={{ color: "#dc2626" }} />
                    </ListItemIcon>
                    Delete conversation
                  </MenuItem>
                </Menu>
              </div>
  );
}
