"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { FormTextField } from "@/shared/components/FormTextField";

export function JobsToolbar({ shown, total, query, onQuery }: { shown: number; total: number; query: string; onQuery: (query: string) => void }) {
  return <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, p: 3, borderBottom: "1px solid #eef0f4" }}>
    <Box><Typography component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>Job management</Typography><Typography sx={{ fontSize: 12, color: "#64748b", mt: 0.5 }}>Showing {shown} of {total} jobs</Typography></Box>
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: { xs: "wrap", sm: "nowrap" }, gap: 1.5, width: { xs: "100%", sm: "auto" } }}>
      <FormTextField label="Search jobs" placeholder="Job, driver, or route" value={query} onChange={(event) => onQuery(event.target.value)} sx={{ width: { xs: "100%", sm: 280 } }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 19 }} /></InputAdornment> } }} />
      <Button component={Link} href="/jobs/new" variant="contained" startIcon={<AddRoundedIcon />} sx={{ height: 48, flexShrink: 0 }}>Create job</Button>
    </Box>
  </Box>;
}
