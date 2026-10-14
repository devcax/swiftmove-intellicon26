"use client";
import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { FeedbackSeverity } from "../feedback/store";

export function FeedbackDialog({ open, title, message, severity = "info", confirmation = false, confirmLabel, cancelLabel = "Cancel", pending = false, error, children, onClose, onConfirm }: {
  open: boolean; title: string; message?: ReactNode; severity?: FeedbackSeverity; confirmation?: boolean;
  confirmLabel?: string; cancelLabel?: string; pending?: boolean; error?: string | null; children?: ReactNode;
  onClose: () => void; onConfirm?: () => void;
}) {
  const titleId = useId(), bodyId = useId();
  const colors = { warning: { ink: "#b45309", ring: "#fcd58c" }, error: { ink: "#dc2626", ring: "#fda4af" }, success: { ink: "#15803d", ring: "#86efac" }, info: { ink: "#1e3a8a", ring: "#a5b4fc" } };
  const tone = colors[severity];
  const Icon = severity === "warning" ? PriorityHighRoundedIcon : severity === "error" ? CloseRoundedIcon : severity === "success" ? CheckRoundedIcon : InfoOutlinedIcon;
  return <Dialog open={open} onClose={() => { if (!pending) onClose(); }} fullWidth maxWidth="sm" aria-labelledby={titleId} aria-describedby={message ? bodyId : undefined} slotProps={{ paper: { sx: { width: 480, maxWidth: "calc(100% - 32px)", m: 2, borderRadius: 1.5, py: 2 } } }}>
    <DialogContent sx={{ textAlign: "center", px: { xs: 2.5, sm: 4 }, pt: 2, pb: 1.5 }}>
      <Box aria-hidden="true" sx={{ width: 76, height: 76, border: "3px solid", borderColor: tone.ring, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 3, color: tone.ink }}><Icon sx={{ fontSize: 44 }} /></Box>
      <Typography id={titleId} component="h2" sx={{ fontSize: 23, fontWeight: 700, color: "#334155", lineHeight: 1.4, mb: 1.5 }}>{title}</Typography>
      {message && <Box id={bodyId} sx={{ fontSize: 13, color: "#64748b", lineHeight: 1.8, overflowWrap: "anywhere" }}>{message}</Box>}
      {children && <Box sx={{ mt: 2, textAlign: "left" }}>{children}</Box>}
      {error && <Typography role="alert" sx={{ color: "#b91c1c", fontSize: 12, mt: 2 }}>{error}</Typography>}
    </DialogContent>
    <DialogActions sx={{ justifyContent: "center", gap: 1, px: 3, pt: 1.5, pb: 1 }}>
      {confirmation && <Button autoFocus variant="contained" disableElevation onClick={onClose} disabled={pending} sx={{ bgcolor: "#f1f5f9", color: "#475569", minWidth: 96, "&:hover": { bgcolor: "#e2e8f0" } }}>{cancelLabel}</Button>}
      <Button autoFocus={!confirmation} variant="contained" disableElevation onClick={onConfirm ?? onClose} disabled={pending} color={severity === "error" ? "error" : severity === "success" ? "success" : "primary"} startIcon={pending ? <CircularProgress size={15} color="inherit" /> : undefined} sx={{ minWidth: 96 }}>{pending ? "Working…" : confirmLabel ?? (confirmation ? "Confirm" : "OK")}</Button>
    </DialogActions>
  </Dialog>;
}
