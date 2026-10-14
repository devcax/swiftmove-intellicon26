"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

/** Shared layout for the page forms and the existing rule revision dialog. */
export function PolicyEditorFrame({ embedded = false, title, children, actions, onClose }: {
  embedded?: boolean;
  title: ReactNode;
  children: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}) {
  if (embedded) {
    return (
      <Box sx={{ bgcolor: "background.paper", border: "1px solid #e2e8f0", borderRadius: 2, p: { xs: 2, sm: 3 } }}>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 800, mb: 3 }}>{title}</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>{children}</Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 1, mt: 3 }}>{actions}</Box>
      </Box>
    );
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>{actions}</DialogActions>
    </Dialog>
  );
}
