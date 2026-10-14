"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import List from "@mui/material/List";
import Box from "@mui/material/Box";
import { isActive, isJobsChildActive, navItems } from "@/features/shell/nav";
import type { SidebarBadgeCounts } from "@/features/shell/nav";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarLink } from "./SidebarLink";
import { UserMenu } from "@/features/auth/components/UserMenu";
import Link from "next/link";
import EastRoundedIcon from "@mui/icons-material/EastRounded";

interface SidebarProps {
  collapsed?: boolean;
  counts: SidebarBadgeCounts;
  onNavigate?: () => void;
}

/** The navigation sidebar, shown beside the page on a wide screen and as a drawer on a narrow one. */
export function Sidebar({ collapsed = false, counts, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden" style={{ backgroundColor: "#fff", borderRight: "1px solid #eef0f4" }}>
      <div className="shrink-0">
        <SidebarBrand collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      <Box sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehaviorY: "contain",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}>
        <div style={{ padding: "12px 16px" }}>
          <UserMenu variant="sidebar" collapsed={collapsed} />
        </div>
      <List
        sx={{
          px: collapsed ? 1.5 : 0,
          py: 0.5,
          display: "flex",
          flexDirection: "column",
          gap: collapsed ? 0.5 : 0,
          "& > *": { flexShrink: 0 },
        }}
        component="nav"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;
          if (item.children && !collapsed) {
            const childActive = item.children.some((child) => isJobsChildActive(pathname, child.href));
            const expanded = openGroups[item.label] ?? childActive;
            return (
              <SidebarGroup
                key={item.label}
                item={item}
                pathname={pathname}
                badgeCount={badgeCount}
                expanded={expanded}
                onToggle={() => setOpenGroups((prev) => ({ ...prev, [item.label]: !expanded }))}
                onNavigate={onNavigate}
              />
            );
          }
          return (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              collapsed={collapsed}
              badgeCount={badgeCount}
              onNavigate={onNavigate}
            />
          );
        })}
      </List>
      {!collapsed && (
        <div style={{ padding: "24px 16px", color: "#64748b", fontSize: 11.5, lineHeight: 1.8 }}>
          <Box component={Link} href="/jobs" onClick={onNavigate}
            sx={{ display: "block", bgcolor: "#1e3a8a", color: "#fff", borderRadius: 1.5, p: 1.75, mb: 2.5, textDecoration: "none", "&:hover": { bgcolor: "#172554" }, "&:focus-visible": { outline: "2px solid #1e3a8a", outlineOffset: 3 } }}>
            <Box sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>Keep every delivery moving</Box>
            <Box sx={{ fontSize: 11.5, color: "#dbe6ff", mt: 0.75, lineHeight: 1.6 }}>Manage jobs, coordinate drivers, and track deliveries.</Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1.25, fontSize: 11.5, fontWeight: 600 }}>Manage jobs <EastRoundedIcon sx={{ fontSize: 15 }} /></Box>
          </Box>
          <div style={{ fontWeight: 700, color: "#475569" }}>SwiftMove Logistics</div>
          <div>© {new Date().getFullYear()} All rights reserved</div>
          <div style={{ marginTop: 8 }}>Logistics Control Room</div>
        </div>
      )}
      </Box>
    </div>
  );
}
