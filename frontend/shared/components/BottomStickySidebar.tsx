"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Box from "@mui/material/Box";

/** Tall sidebars scroll into view before sticking; shorter ones sit below the app header. */
export function BottomStickySidebar({ children }: { children: ReactNode }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sidebar = element.current;
    if (!sidebar) return;
    const measure = () => sidebar.style.setProperty("--sidebar-height", `${sidebar.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sidebar);
    return () => observer.disconnect();
  }, []);
  return <Box ref={element} sx={{
    minWidth: 0, alignSelf: "start", position: { xs: "static", lg: "sticky" },
    top: { lg: "min(76px, calc(100dvh - var(--sidebar-height, 0px) - 16px))" },
  }}>{children}</Box>;
}
