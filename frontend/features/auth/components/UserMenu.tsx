"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { fetchCurrentUser, logout } from "../api";
import type { CurrentUser } from "../schemas";
import { feedback } from "@/shared/feedback/store";

export function UserMenu({ variant = "header", collapsed = false }: { variant?: "header" | "sidebar"; collapsed?: boolean }) {
  const router = useRouter();
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        // A 401 already sent the browser to the login page; any other failure leaves the menu generic.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setAnchor(null);
    try {
      await logout();
      feedback.info("You have been signed out.");
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : "Could not complete sign out.");
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  if (variant === "header") {
    return (
      <Tooltip title={user?.name ?? "Account"}>
        <Avatar variant="rounded" aria-label={user?.name ?? "Account"}
          sx={{ width: 34, height: 34, bgcolor: "#e2e9f8", color: "#1e3a8a", fontSize: 12, fontWeight: 700 }}>
          <PersonRoundedIcon sx={{ fontSize: 22 }} />
        </Avatar>
      </Tooltip>
    );
  }

  return (
    <>
        <ButtonBase onClick={(event) => setAnchor(event.currentTarget)} aria-label="Open account menu"
          aria-haspopup="menu" aria-expanded={Boolean(anchor)}
          sx={{ width: "100%", gap: 1.25, p: collapsed ? 0 : 1, borderRadius: 1, bgcolor: collapsed ? "transparent" : "#f5f6f8", textAlign: "left", justifyContent: collapsed ? "center" : "flex-start", "&:hover": { bgcolor: "#edf0f5" }, "&.Mui-focusVisible": { outline: "2px solid #1e3a8a", outlineOffset: 2 } }}>
          <Avatar variant="rounded" sx={{ width: collapsed ? 48 : 42, height: collapsed ? 48 : 42, bgcolor: "#e2e9f8", color: "#1e3a8a", fontSize: 14, fontWeight: 700 }}>
            <PersonRoundedIcon sx={{ fontSize: 25 }} />
          </Avatar>
          {!collapsed && <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: "#253047" }}>{user?.name ?? "Account"}</Typography>
            <Typography noWrap sx={{ fontSize: 12, color: "#64748b", mt: 0.25 }}>{user?.roles.length ? user.roles.join(", ") : "Control Room"}</Typography>
          </Box>}
          {!collapsed && <ExpandMoreRoundedIcon sx={{ fontSize: 20, color: "#64748b" }} />}
        </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { mt: 0.5, width: 216, maxWidth: "calc(100vw - 32px)", border: 0, borderRadius: 2, boxShadow: "0 2px 8px rgba(15,23,42,0.12)" } } }}
      >
        {user && (
          <div className="px-4 py-2">
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {user.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {user.email}
            </Typography>
          </div>
        )}
        {user && <Divider />}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}
