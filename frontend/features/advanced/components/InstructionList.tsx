"use client";

import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { useInstructions } from "@/features/advanced/hooks/useInstructions";
import type { ApiInstruction } from "@/features/advanced/types";
import { AdvancedNotice } from "./AdvancedNotice";

const columns: DataTableColumn<ApiInstruction>[] = [
  { key: "number", label: "S.No", width: 64, render: (_, index) => index + 1 },
  { key: "title", label: "Title", width: "42%", render: (instruction) => <Box>
    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{instruction.label}</Typography>
    <Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 0.5, lineHeight: 1.6 }}>{instruction.description}</Typography>
  </Box> },
  { key: "status", label: "Status", render: (instruction) => <Chip size="small" label={instruction.isCustomized ? "Customized" : "System default"}
    sx={{ bgcolor: instruction.isCustomized ? "#edf2fc" : "#f1f5f9", color: instruction.isCustomized ? "#1e3a8a" : "#475569", fontSize: 11 }} /> },
  { key: "version", label: "Version", align: "center", render: (instruction) => instruction.version },
  { key: "modified", label: "Modified", render: (instruction) => instruction.updatedAt
    ? new Date(instruction.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Built-in default" },
];

export function InstructionList() {
  const { instructions, error, load } = useInstructions();
  return <Box className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-3 sm:p-6">
    <AdvancedNotice />
    {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}
    <Paper component="section" sx={{ border: 0, borderRadius: 1.5, overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, py: 2, borderBottom: "1px solid #e5e7eb" }}>
        <DescriptionOutlinedIcon sx={{ fontSize: 20, color: "#64748b" }} />
        <Typography component="h1" sx={{ fontSize: 17, fontWeight: 700 }}>AI instructions</Typography>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
        <DataTable columns={columns} rows={instructions ?? []} getRowKey={(instruction) => instruction.key}
          label="AI instructions" variant="striped" scrollMode="page" pageSize={10} minWidth={800} loading={!instructions && !error}
          emptyMessage={error ? "Instructions could not be loaded" : "No AI instructions available"}
          renderActions={(instruction) => <Tooltip title="Edit instruction"><IconButton component={Link}
            href={`/advanced/${encodeURIComponent(instruction.key)}/edit`} aria-label={`Edit ${instruction.label}`}
            sx={{ width: 32, height: 32, borderRadius: 1, color: "#fff", bgcolor: "#1e3a8a", "&:hover": { bgcolor: "#172554" } }}>
            <EditOutlinedIcon sx={{ fontSize: 17 }} />
          </IconButton></Tooltip>} />
      </Box>
    </Paper>
  </Box>;
}
