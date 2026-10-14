"use client";
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { dismissToast, type ToastMessage } from "./store";

export function ToastItem({ toast }: { toast: ToastMessage }) {
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const remaining = useRef(toast.duration);
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(() => dismissToast(toast.id), remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - started)); };
  }, [paused, toast.id]);
  const tone = { success: "#16a34a", error: "#dc2626", info: "#2563eb", warning: "#b45309" }[toast.severity];
  const Icon = { success: CheckCircleRoundedIcon, error: CancelRoundedIcon, info: InfoRoundedIcon, warning: WarningRoundedIcon }[toast.severity];
  return <Paper role={toast.severity === "error" ? "alert" : "status"} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }} sx={{ pointerEvents: "auto", position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-start", gap: 1.25, p: 2, pr: 4.5, pb: 2.25, bgcolor: "#fff", borderRadius: 1.5, boxShadow: "0 3px 8px rgba(15,23,42,0.14)" }}>
    <Icon sx={{ color: tone, fontSize: 22, mt: 0.25, flexShrink: 0 }} />
    <Typography sx={{ fontSize: 12.5, lineHeight: 1.7, color: "#475569", overflowWrap: "anywhere" }}>{toast.message}</Typography>
    <IconButton size="small" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)} sx={{ position: "absolute", right: 5, top: 5, color: "#64748b" }}><CloseRoundedIcon sx={{ fontSize: 17 }} /></IconButton>
    <Box aria-hidden="true" sx={{ position: "absolute", left: 0, bottom: 0, height: 3, width: "100%", bgcolor: tone, transformOrigin: "left", animation: `toast-countdown ${toast.duration}ms linear forwards`, animationPlayState: paused ? "paused" : "running", "@keyframes toast-countdown": { from: { transform: "scaleX(1)" }, to: { transform: "scaleX(0)" } }, "@media (prefers-reduced-motion: reduce)": { animation: "none" } }} />
  </Paper>;
}
