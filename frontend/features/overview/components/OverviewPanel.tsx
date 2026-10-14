import type { ReactNode } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { SectionPreloader } from "@/shared/components/SectionPreloader";

export const overviewPanelSx = {
  border: 0, borderRadius: 1.5, bgcolor: "#fff", boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
};

/** Consistent dashboard section with an optional link to its full operational view. */
export function OverviewPanel({ title, subtitle, href, children, height = 380, loading = false }: {
  title: string; subtitle?: string; href?: string; children?: ReactNode; height?: number; loading?: boolean;
}) {
  return (
    <Paper component="section" aria-busy={loading} sx={{ ...overviewPanelSx, height, display: "flex", flexDirection: "column", overflow: "hidden", p: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2, mb: 3, flexShrink: 0 }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
        {href && <Box component={Link} href={href} aria-label={`View all ${title.toLowerCase()}`}
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, flexShrink: 0, color: "#1e3a8a", fontSize: 12, fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
          View all <ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />
        </Box>}
      </Box>
      <Box className="panel-scroll" sx={{
        flex: 1, minHeight: 0, overflow: "auto",
        marginInlineEnd: { xs: -1.5, sm: -2 },
        paddingInlineEnd: { xs: 3, sm: 3.5 },
      }}>
        {loading ? <SectionPreloader label={`Loading ${title.toLowerCase()}…`} /> : children}
      </Box>
    </Paper>
  );
}
