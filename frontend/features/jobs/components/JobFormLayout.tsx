"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

/** Shared full-width page form structure for job creation and editing. */
export function JobFormLayout({ title, guidance, editing = false, busy, disabled, onSubmit, children }: {
  title: string; guidance: string; editing?: boolean; busy: boolean; disabled: boolean; onSubmit: () => Promise<void>; children: ReactNode;
}) {
  return <Paper component="section" sx={{ border: 0, borderRadius: 1.5, overflow: "hidden" }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 3, py: 2, borderBottom: "1px solid #e5e7eb" }}>
      {editing ? <EditOutlinedIcon sx={{ fontSize: 20, color: "#64748b" }} /> : <AddRoundedIcon sx={{ fontSize: 20, color: "#64748b" }} />}
      <Typography component="h1" sx={{ fontSize: 17, fontWeight: 700 }}>{title}</Typography>
    </Box>
    <Box component="form" noValidate onSubmit={(event) => { event.preventDefault(); void onSubmit(); }} sx={{ p: { xs: 2, sm: 3 } }}>
      <Alert severity="info" sx={{ mb: 3, fontSize: 12.5 }}>{guidance}</Alert>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>{children}</Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 4, pt: 2.5, borderTop: "1px solid #eef0f4" }}>
        <Button component={Link} href="/jobs" variant="outlined" disabled={busy}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={disabled || busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {editing ? (busy ? "Saving…" : "Save changes") : busy ? "Publishing…" : "Publish job"}
        </Button>
      </Box>
    </Box>
  </Paper>;
}
