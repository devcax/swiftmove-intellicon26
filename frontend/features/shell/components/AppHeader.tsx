"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import EastRoundedIcon from "@mui/icons-material/EastRounded";
import { UserMenu } from "@/features/auth/components/UserMenu";
import type { PageMeta } from "@/features/shell/pageMeta";
import { NotificationMenu } from "./NotificationMenu";

interface AppHeaderProps {
  meta: PageMeta;
  showMenuButton: boolean;
  onMenu: () => void;
  menuExpanded?: boolean;
  desktop?: boolean;
}

/** Compact page heading, notifications, and signed-in user. */
export function AppHeader({ meta, showMenuButton, onMenu, menuExpanded, desktop }: AppHeaderProps) {
  return (
    <AppBar component="header" position="sticky" elevation={0} sx={{ top: 0, bgcolor: "#fff", border: 0, color: "text.primary", flexShrink: 0 }}>
      <Toolbar
        className="flex w-full flex-row items-center justify-between"
        sx={{ minHeight: { xs: 60, sm: 60 }, gap: { xs: 1, sm: 2 }, px: { xs: 1.5, sm: 2.5 } }}
      >
        {showMenuButton && (
          <IconButton edge="start" onClick={onMenu} aria-label={desktop ? (menuExpanded ? "Collapse sidebar" : "Expand sidebar") : "Open navigation"} aria-expanded={menuExpanded} sx={{ color: "#758196", p: 1 }}>
            {desktop && !menuExpanded ? <EastRoundedIcon sx={{ fontSize: 23, color: "#1e3a8a" }} /> : <MenuRoundedIcon sx={{ fontSize: 26 }} />}
          </IconButton>
        )}

        <Box sx={{ mr: "auto", minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: 15, sm: 18 }, fontWeight: 700, lineHeight: 1.2 }} noWrap>
            {meta.title}
          </Typography>
          {meta.subtitle && (
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11 }} noWrap>
              {meta.subtitle}
            </Typography>
          )}
        </Box>
        <NotificationMenu />
        <UserMenu />
      </Toolbar>
    </AppBar>
  );
}
