"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { FormTextField } from "@/shared/components/FormTextField";
import { useInstructionEditor, type InstructionEditorProps } from "@/features/advanced/hooks/useInstructionEditor";

/** Full-page plain-text instruction form; technical prompt content is never rich text. */
export function InstructionEditor(props: InstructionEditorProps) {
  const { instruction } = props;
  const { draft, setDraft, saving, dirty, lengthProblem, confirmReset, setConfirmReset, showDefault, setShowDefault, save, reset } = useInstructionEditor(props);
  return (
    <Paper component="section" sx={{ border: 0, borderRadius: 1.5, overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, px: 3, py: 2, borderBottom: "1px solid #e5e7eb" }}>
        <EditOutlinedIcon sx={{ fontSize: 20, color: "#64748b" }} />
        <Typography component="h1" sx={{ fontSize: 17, fontWeight: 700 }}>Edit AI instruction</Typography>
        <Chip size="small" variant="outlined" label={instruction.isCustomized ? `Customized · v${instruction.version}` : "System default"} sx={{ ml: "auto" }} />
      </Box>
      <Box component="form" onSubmit={(event) => { event.preventDefault(); void save(); }} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ bgcolor: "#f8fafc", borderRadius: 1, p: 2, mb: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>Editing guidance</Typography>
          <Typography sx={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.8 }}>Preserve required output formats, field names, and placeholders used by this instruction. Changes apply to new messages within a minute. You can compare with the system default or restore it below.</Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}>
          <FormTextField label="Title" value={instruction.label} slotProps={{ input: { readOnly: true } }} helperText="The AI feature this instruction belongs to." />
          <FormTextField label="Instruction key" value={instruction.key} slotProps={{ input: { readOnly: true } }} helperText="System identifier; cannot be changed." />
          <FormTextField label="Description" value={instruction.description} multiline minRows={2} slotProps={{ input: { readOnly: true } }} sx={{ gridColumn: "1 / -1" }} />
        </Box>
        <FormTextField label="AI instruction" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={saving}
          fullWidth multiline minRows={16} maxRows={32} error={Boolean(lengthProblem)}
          helperText={lengthProblem ?? `${draft.length.toLocaleString()} characters · plain text`}
          slotProps={{ htmlInput: { className: "panel-scroll", style: { fontFamily: "var(--font-geist-mono), monospace", fontSize: 12.5, lineHeight: 1.8 } } }} />
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mt: 3 }}>
          {instruction.isCustomized && <>
            <Button color="inherit" disabled={saving} onClick={() => setShowDefault((value) => !value)} aria-expanded={showDefault}>
              {showDefault ? "Hide system default" : "Compare with system default"}
            </Button>
            <Button color="inherit" startIcon={<RestartAltRoundedIcon />} disabled={saving} onClick={() => setConfirmReset(true)}>Reset to default</Button>
          </>}
          <Button type="submit" variant="contained" disabled={saving || !dirty || Boolean(lengthProblem)} sx={{ ml: "auto" }}>
            {saving ? "Saving…" : "Save instruction"}
          </Button>
        </Box>
        <Collapse in={showDefault}>
          <Box component="pre" className="panel-scroll" sx={{ mt: 2, p: 2, bgcolor: "#f1f5f9", borderRadius: 1, fontFamily: "monospace", fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 320, overflow: "auto" }}>
            {instruction.defaultContent ?? "Default unavailable."}
          </Box>
        </Collapse>
      </Box>
      <ConfirmDialog confirm={confirmReset ? {
        title: "Reset to the system default?",
        body: `Your custom version of "${instruction.label}" will be discarded and the bot will use the built-in instruction again.`,
        action: reset,
      } : null} onClose={() => setConfirmReset(false)} />
    </Paper>
  );
}
