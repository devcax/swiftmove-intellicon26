"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import AddBoxRoundedIcon from "@mui/icons-material/AddBoxRounded";

/** Dashboard-wide shortcuts to the existing driver and job creation forms. */
export function QuickCreateButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const actions = [
    { label: "Create driver", href: "/drivers/new", icon: <PersonAddAltRoundedIcon /> },
    { label: "Create job", href: "/jobs/new", icon: <AddBoxRoundedIcon /> },
  ];

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <SpeedDial
        ariaLabel="Quick create"
        icon={<SpeedDialIcon />}
        direction="up"
        open={open}
        onOpen={(_, reason) => { if (reason === "toggle") setOpen(true); }}
        onClose={(_, reason) => { if (reason !== "mouseLeave") setOpen(false); }}
        FabProps={{ title: open ? "Close shortcuts" : "Create driver or job" }}
        sx={{
          position: "fixed",
          right: { xs: "max(16px, env(safe-area-inset-right))", sm: 24 },
          bottom: "max(24px, env(safe-area-inset-bottom))",
          zIndex: theme => theme.zIndex.speedDial,
          "& .MuiSpeedDial-fab": {
            width: 56, height: 56, bgcolor: "primary.main", color: "primary.contrastText",
            boxShadow: "0 3px 8px rgba(30,58,138,0.24)",
            "&:hover": { bgcolor: "primary.dark" },
          },
          "& .MuiSpeedDialAction-fab": { width: 44, height: 44, color: "primary.main" },
          "& .MuiSpeedDialAction-staticTooltipLabel": {
            whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, color: "#1e3a8a", bgcolor: "#fff",
          },
          "@media (prefers-reduced-motion: reduce)": {
            "& *, & .MuiSpeedDialIcon-icon": { transition: "none !important", animation: "none !important" },
          },
        }}
      >
        {actions.map(action => (
          <SpeedDialAction
            key={action.href}
            icon={action.icon}
            slotProps={{
              tooltip: { title: action.label, open: true },
              fab: {
                "aria-label": action.label,
                onClick: () => { setOpen(false); router.push(action.href); },
              },
            }}
          />
        ))}
      </SpeedDial>
    </ClickAwayListener>
  );
}
