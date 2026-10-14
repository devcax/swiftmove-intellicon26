export function navButtonSx(active: boolean, collapsed = false) {
  return {
    borderRadius: collapsed ? 1.5 : 0,
    minHeight: collapsed ? 48 : 46,
    py: 0.75,
    px: collapsed ? 0 : 2.5,
    width: collapsed ? 48 : "100%",
    mx: collapsed ? "auto" : 0,
    position: "relative",
    justifyContent: collapsed ? "center" : "flex-start",
    color: active ? "#1e3a8a" : "#5b667a",
    backgroundColor: active ? "#edf2fc" : "transparent",
    transition: "color 180ms ease-out",
    "&::after": {
      content: active && !collapsed ? '""' : "none",
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: 4,
      borderRadius: 4,
      backgroundColor: "#1e3a8a",
    },
    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
    "&.Mui-focusVisible": { outline: "2px solid #1e3a8a", outlineOffset: -2 },
    "& .MuiListItemIcon-root": {
      color: active ? "#1e3a8a" : "#8792a5",
      transition: "color 0.2s ease-in-out",
    },
    "&.Mui-selected": {
      backgroundColor: "#edf2fc",
      "&:hover": { backgroundColor: "#edf2fc" },
    },
    "&:hover": {
      backgroundColor: active ? "#edf2fc" : "transparent",
      color: "#1e3a8a",
      "& .MuiListItemIcon-root, & .sidebar-expand-icon": { color: "#1e3a8a" },
    },
  } as const;
}
