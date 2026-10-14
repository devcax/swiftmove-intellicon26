"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import type { BreadcrumbItem } from "@/features/shell/breadcrumbs";
import { dashboardPageWidth } from "@/shared/styles/pageLayout";

/** Shared breadcrumb strip above dashboard page content. */
export function PageBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Box sx={{ ...dashboardPageWidth, pt: { xs: 1.5, sm: 2.5 }, flexShrink: 0 }}>
      <Breadcrumbs aria-label="Breadcrumb" separator="/"
        sx={{
          bgcolor: "#fff", borderRadius: 1.5, minHeight: 44, px: { xs: 2, sm: 2.5 }, py: 1,
          display: "flex", alignItems: "center",
          "& .MuiBreadcrumbs-ol": { rowGap: 0.5 },
          "& .MuiBreadcrumbs-separator": { color: "#1e3a8a", mx: 1.25, fontSize: 17 },
        }}>
        {items.map((item, index) => item.href && index < items.length - 1 ? (
          <Box key={`${item.label}-${index}`} component={Link} href={item.href}
            sx={{ fontSize: 13, color: "#64748b", textDecoration: "none", "&:hover": { color: "#1e3a8a" }, "&:focus-visible": { outline: "2px solid #1e3a8a", outlineOffset: 3, borderRadius: 0.5 } }}>
            {item.label}
          </Box>
        ) : (
          <Typography key={`${item.label}-${index}`} aria-current="page" sx={{ fontSize: 13, fontWeight: 500, color: "#1e3a8a", overflowWrap: "anywhere" }}>
            {item.label}
          </Typography>
        ))}
      </Breadcrumbs>
    </Box>
  );
}
