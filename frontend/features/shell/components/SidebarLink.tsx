"use client";

import Link from "next/link";
import Badge from "@mui/material/Badge";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import type { NavItem } from "@/features/shell/nav";
import { navButtonSx } from "@/features/shell/navStyles";
import { SidebarNotificationBadge } from "./SidebarNotificationBadge";

interface SidebarLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badgeCount: number;
  onNavigate?: () => void;
}

/** A plain sidebar entry: an icon and a label, or only the icon when the sidebar is collapsed. */
export function SidebarLink({ item, active, collapsed, badgeCount, onNavigate }: SidebarLinkProps) {
  const incident = item.badgeKey === "incidents";
  return (
    <Link href={item.href} onClick={onNavigate} aria-label={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className="block w-full no-underline">
      <Tooltip title={collapsed ? item.label : ""} placement="right" arrow>
        <ListItemButton selected={active} sx={navButtonSx(active, collapsed)}>
          <ListItemIcon sx={{ minWidth: collapsed ? 0 : 38, justifyContent: "center" }}>
            {collapsed ? (
              <Badge badgeContent={badgeCount} color={incident ? "error" : "warning"} invisible={badgeCount === 0} max={99}>
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>
          {!collapsed && (
            <>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { sx: { fontSize: 14.5, fontWeight: active ? 700 : 500 } } }}
              />
              <SidebarNotificationBadge count={badgeCount} incident={incident} />
            </>
          )}
        </ListItemButton>
      </Tooltip>
    </Link>
  );
}
