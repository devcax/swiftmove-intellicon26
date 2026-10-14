"use client";

import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useInstructions } from "@/features/advanced/hooks/useInstructions";
import { EmptyState } from "@/shared/components/EmptyState";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { AdvancedNotice } from "./AdvancedNotice";
import { InstructionEditor } from "./InstructionEditor";

export function InstructionEditPage({ instructionKey }: { instructionKey: string }) {
  const { instructions, error, load, notify, notifyError } = useInstructions();
  const instruction = instructions?.find((item) => item.key === instructionKey);
  return <Box className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-3 sm:p-6">
    <Box><Button component={Link} href="/advanced" variant="outlined" startIcon={<ArrowBackRoundedIcon />}>All AI instructions</Button></Box>
    <AdvancedNotice />
    {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}
    {instruction ? <InstructionEditor key={`${instruction.key}:${instruction.version}`} instruction={instruction} notify={notify} notifyError={notifyError} onChanged={load} />
      : <Paper sx={{ border: 0, p: 3, minHeight: 300 }}>
        {!instructions && !error ? <SectionPreloader label="Loading instruction…" /> : <EmptyState title={error ? "Instruction unavailable" : "Instruction not found"} description={error ? "Retry loading or return to the instruction list." : "Return to the instruction list to choose an available instruction."} />}
      </Paper>}
  </Box>;
}
