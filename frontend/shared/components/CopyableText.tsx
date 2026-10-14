"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { feedback } from "@/shared/feedback/store";

/** Selectable value with a clipboard action and accessible success/failure feedback. */
export function CopyableText({ value, label }: { value?: string | null; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [status]);
  const copy = async () => {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); setStatus("copied"); feedback.success(`${label} copied.`); }
    catch { setStatus("failed"); feedback.error("Copy failed. Select the code and copy it manually."); }
  };
  if (!value) return <span>—</span>;
  const message = status === "copied" ? `${label} copied` : status === "failed" ? "Copy failed. Select the code and copy it manually." : `Copy ${label.toLowerCase()}`;
  return <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, whiteSpace: "nowrap" }}>
    <Box component="span" sx={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11.5, color: "#475569", userSelect: "text" }}>{value}</Box>
    <Tooltip title={message}><IconButton size="small" aria-label={message} onClick={() => void copy()}
      sx={{ width: 26, height: 26, color: status === "copied" ? "#15803d" : status === "failed" ? "#b91c1c" : "#64748b", "& .MuiSvgIcon-root": { fontSize: 14 } }}>
      {status === "copied" ? <CheckRoundedIcon /> : status === "failed" ? <ErrorOutlineRoundedIcon /> : <ContentCopyRoundedIcon />}
    </IconButton></Tooltip>
    <span className="sr-only" role="status">{status !== "idle" ? message : ""}</span>
  </Box>;
}
