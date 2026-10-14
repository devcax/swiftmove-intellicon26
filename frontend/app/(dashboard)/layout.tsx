"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { ManagerChatPanel } from "@/features/managerChat/components/ManagerChatPanel";
import { AppHeader } from "@/features/shell/components/AppHeader";
import { Sidebar } from "@/features/shell/components/Sidebar";
import { useSidebarCounts } from "@/features/shell/hooks/useSidebarCounts";
import { pageMetaFor } from "@/features/shell/pageMeta";
import { breadcrumbsFor } from "@/features/shell/breadcrumbs";
import { PageBreadcrumbs } from "@/features/shell/components/PageBreadcrumbs";
import { QuickCreateButton } from "@/features/shell/components/QuickCreateButton";

const DRAWER_WIDTH = 248;
const COLLAPSED_WIDTH = 80;

/** The date shown under the overview title; empty until the browser has told us the date, so the server and the browser agree. */
function useToday() {
  return React.useSyncExternalStore(
    () => () => {},
    () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
    () => ""
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const counts = useSidebarCounts(pathname);
  const meta = pageMetaFor(pathname, useToday());
  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box className="flex min-h-dvh bg-[#f6f8fb]">
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            transition: "width 0.2s ease",
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            "& .MuiDrawer-paper": {
              width: sidebarWidth,
              boxSizing: "border-box",
              border: "none",
              transition: "width 0.2s ease",
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
              overflowX: "hidden",
            },
          }}
        >
          <Sidebar collapsed={collapsed} counts={counts} />
        </Drawer>
      )}

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH, border: "none" } }}
      >
        {mobileOpen && <Sidebar counts={counts} onNavigate={() => setMobileOpen(false)} />}
      </Drawer>

      <Box className="flex min-w-0 flex-1 flex-col">
        <AppHeader meta={meta} showMenuButton desktop={isDesktop} menuExpanded={isDesktop ? !collapsed : mobileOpen}
          onMenu={() => isDesktop ? setCollapsed((c) => !c) : setMobileOpen(true)} />
        <Box component="main" className="flex min-w-0 flex-1 flex-col"
          sx={pathname === "/conversations" ? { height: "calc(100dvh - 60px)", flex: "none" } : undefined}>
          {pathname !== "/" && pathname !== "/dashboard" && <PageBreadcrumbs items={breadcrumbsFor(pathname)} />}
          <Box className="min-h-0 min-w-0 flex-1">
            {children}
          </Box>
        </Box>
        <Box component="footer" sx={{ flexShrink: 0, bgcolor: "#fff", color: "#64748b", textAlign: "center", px: 2, py: 2, fontSize: 12.5 }}>
          Copyright &copy; {new Date().getFullYear()} <Box component="span" sx={{ color: "#1e3a8a", fontWeight: 600 }}>SwiftMove Logistics</Box>. All rights reserved.
        </Box>
      </Box>

      {!chatOpen && (
        <Tooltip title="Ask the assistant" placement="left">
          <Fab color="primary" aria-label="Open the assistant" onClick={() => setChatOpen(true)}
            sx={{ position: "fixed", right: 0, top: "50%", transform: "translateY(-50%)", width: 38, height: 38, minHeight: 38, borderRadius: "6px 0 0 6px", zIndex: (theme) => theme.zIndex.appBar - 1, boxShadow: "-2px 2px 8px rgba(30,58,138,0.24)", "&.Mui-focusVisible": { outline: "2px solid #1e3a8a", outlineOffset: -3 } }}>
            <AutoAwesomeRoundedIcon sx={{ fontSize: 21 }} />
          </Fab>
        </Tooltip>
      )}
      {!chatOpen && <QuickCreateButton key={pathname} />}
      <ManagerChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </Box>
  );
}
