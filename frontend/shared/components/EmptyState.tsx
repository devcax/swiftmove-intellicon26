import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

/** Centered empty content for a bounded panel or table body. */
export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <Box sx={{ height: "100%", minHeight: 160, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 1, p: 2.5 }}>
      <Box aria-hidden="true" sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: "50%", bgcolor: "#f1f5f9", color: "#8792a5", mb: 0.5, "& .MuiSvgIcon-root": { fontSize: 27 } }}>
        {icon ?? <InboxOutlinedIcon />}
      </Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#475569" }}>{title}</Typography>
      {description && <Typography sx={{ fontSize: 12, lineHeight: 1.7, color: "#64748b", maxWidth: 300 }}>{description}</Typography>}
    </Box>
  );
}
