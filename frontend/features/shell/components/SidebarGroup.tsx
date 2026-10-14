"use client";

import Link from "next/link";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import useMediaQuery from "@mui/material/useMediaQuery";
import ArrowRightRoundedIcon from "@mui/icons-material/ArrowRightRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { isJobsChildActive } from "@/features/shell/nav";
import type { NavItem } from "@/features/shell/nav";
import { navButtonSx } from "@/features/shell/navStyles";
import { SidebarNotificationBadge } from "./SidebarNotificationBadge";

interface SidebarGroupProps {
  item: NavItem;
  pathname: string;
  badgeCount: number;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

/** A sidebar entry with sub-pages (Jobs): the heading and, when open, its children. */
export function SidebarGroup({ item, pathname, badgeCount, expanded, onToggle, onNavigate }: SidebarGroupProps) {
  const childActive = (item.children ?? []).some((child) => isJobsChildActive(pathname, child.href));
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  return (
    <div>
      <ListItemButton onClick={onToggle} selected={childActive} aria-expanded={expanded} aria-controls={expanded ? `sidebar-group-${item.label}` : undefined} sx={navButtonSx(childActive)}>
        <ListItemIcon sx={{ minWidth: 38, justifyContent: "center" }}>{item.icon}</ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{ primary: { sx: { fontSize: 14.5, fontWeight: childActive ? 700 : 500 } } }}
        />
        <SidebarNotificationBadge count={badgeCount} incident={item.badgeKey === "incidents"} />
        <ArrowRightRoundedIcon className="sidebar-expand-icon" sx={{
          fontSize: 22,
          color: childActive ? "#1e3a8a" : "#8792a5",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }} />
      </ListItemButton>
      <Collapse in={expanded} timeout={reducedMotion ? 0 : 180} unmountOnExit
        easing="cubic-bezier(0.22, 1, 0.36, 1)">
        <div id={`sidebar-group-${item.label}`} style={{ padding: "4px 16px 4px 28px", display: "flex", flexDirection: "column", gap: 0 }}>
          {(item.children ?? []).map((child) => {
            const activeChild = isJobsChildActive(pathname, child.href);
            return (
              <Link key={child.href} href={child.href} onClick={onNavigate} aria-current={activeChild ? "page" : undefined} className="block w-full no-underline">
                <ListItemButton
                  disableRipple
                  selected={activeChild}
                  sx={{
                    py: 0.5,
                    px: 1.5,
                    minHeight: 34,
                    width: "100%",
                    justifyContent: "flex-start",
                    borderRadius: 1.5,
                    color: activeChild ? "#1e3a8a" : "#475569",
                    backgroundColor: "transparent",
                    transition: "color 180ms ease-out",
                    "& .MuiListItemText-root, & .sidebar-child-dash": {
                      transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                    },
                    "@media (prefers-reduced-motion: reduce)": {
                      transition: "none",
                      "& .MuiListItemText-root, & .sidebar-child-dash": { transition: "none", transform: "none !important" },
                    },
                    "&.Mui-focusVisible": { outline: "2px solid #1e3a8a", outlineOffset: -2 },
                    "&.Mui-selected": {
                      backgroundColor: "transparent",
                      "&:hover": { backgroundColor: "transparent" },
                    },
                    "&:hover": {
                      backgroundColor: "transparent",
                      color: "#1e3a8a",
                      "& .MuiListItemIcon-root": { color: "#1e3a8a" },
                      "& .sidebar-child-dash": { transform: "scaleX(1.8)" },
                      "& .MuiListItemText-root": { transform: "translateX(6px)" },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 24,
                      justifyContent: "center",
                      color: activeChild ? "#1e3a8a" : "#64748b",
                      transition: "color 0.2s ease-in-out",
                    }}
                  >
                    <RemoveRoundedIcon className="sidebar-child-dash" sx={{ fontSize: 12, transformOrigin: "left center" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={child.label}
                    slotProps={{ primary: { sx: { fontSize: 14, fontWeight: activeChild ? 700 : 500 } } }}
                  />
                </ListItemButton>
              </Link>
            );
          })}
        </div>
      </Collapse>
    </div>
  );
}
