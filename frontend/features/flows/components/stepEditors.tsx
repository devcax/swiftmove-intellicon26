// ---------------------------------------------------------------------------
// Sub-editors used inside the step settings panel: option lists, ACTION
// params, classifier categories and the free-text routing (onText) editor.
// Every row stacks its fields full width so the narrow panel stays aligned.
// ---------------------------------------------------------------------------

"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import type { ApiFlowOption, ApiFlowStep } from "@/features/flows/types";
import { MAX_OPTION_LABEL, MAX_OPTIONS } from "../model";

/** Friendly names for step ids ("Send Message"), so "goes to" lists read as words, not ids. */
export const StepNamesContext = React.createContext<Map<string, string>>(new Map());

const rowSx = { display: "flex", flexDirection: "column", gap: 1.25, p: 1.5, border: "1px solid #e2e8f0", borderRadius: 1.5, bgcolor: "#f8fafc" } as const;
const monoInput = { htmlInput: { style: { fontFamily: "monospace", fontSize: 12 } } };

function RemoveButton({ title, disabled, onClick }: { title: string; disabled?: boolean; onClick: () => void }) {
  return <Tooltip title={title}><span><IconButton size="small" aria-label={title} disabled={disabled} onClick={onClick} sx={{ color: "#94a3b8", "&:hover": { color: "#dc2626" } }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></span></Tooltip>;
}

function AddButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return <Box><Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={disabled} onClick={onClick}>{children}</Button></Box>;
}

// ---------------------------------------------------------------------------
// "Goes to step" dropdown shared by every branching field
// ---------------------------------------------------------------------------

export function NextStepSelect({
  label = "Goes to",
  value,
  targets,
  onChange,
  allowEmpty = false,
  size = "small",
}: {
  label?: string;
  value: string | undefined;
  targets: string[];
  onChange: (next: string | undefined) => void;
  allowEmpty?: boolean;
  size?: "small" | "medium";
}) {
  const names = React.useContext(StepNamesContext);
  return (
    <TextField
      select fullWidth
      size={size}
      label={label || undefined}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      slotProps={{ select: { displayEmpty: allowEmpty, renderValue: (selected) => (selected ? `${names.get(selected as string) ?? "Step"} · ${selected}` : allowEmpty ? "Nowhere" : "") } }}
      sx={{ bgcolor: "#fff" }}
    >
      {allowEmpty && <MenuItem value=""><em>Nowhere</em></MenuItem>}
      {targets.map((id) => (
        <MenuItem key={id} value={id} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{names.get(id) ?? id}</Typography>
          <Typography sx={{ fontSize: 11, fontFamily: "monospace", color: "text.secondary" }}>{id}</Typography>
        </MenuItem>
      ))}
    </TextField>
  );
}

// ---------------------------------------------------------------------------
// Button/list option editor (ASK_CHOICE, ASK_LOCATION)
// ---------------------------------------------------------------------------

export function OptionsEditor({
  options,
  targets,
  onChange,
}: {
  options: ApiFlowOption[];
  targets: string[];
  onChange: (options: ApiFlowOption[]) => void;
}) {
  const update = (index: number, patch: Partial<ApiFlowOption>) => {
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {options.map((option, index) => (
        <Box key={index} sx={rowSx}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 24, height: 24, flexShrink: 0, borderRadius: "50%", bgcolor: "#edf2fc", color: "primary.main", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{index + 1}</Box>
            <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Button {index + 1}</Typography>
            <RemoveButton title="Remove this button" disabled={options.length <= 1} onClick={() => onChange(options.filter((_o, i) => i !== index))} />
          </Box>
          <TextField
            size="small" fullWidth label="Button text" value={option.label}
            error={option.label.length > MAX_OPTION_LABEL}
            helperText={option.label.length > MAX_OPTION_LABEL ? `WhatsApp allows ${MAX_OPTION_LABEL} characters` : `${option.label.length}/${MAX_OPTION_LABEL}`}
            onChange={(e) => update(index, { label: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 40 }, formHelperText: { sx: { textAlign: "right", mx: 0 } } }}
            sx={{ bgcolor: "#fff", "& .MuiFormHelperText-root": { bgcolor: "#f8fafc", m: 0, pt: 0.5 } }}
          />
          <NextStepSelect label="When tapped, go to" value={option.next} targets={targets} onChange={(next) => update(index, { next })} />
          <TextField size="small" fullWidth label="Button ID" value={option.id} onChange={(e) => update(index, { id: e.target.value })} slotProps={monoInput} sx={{ bgcolor: "#fff" }} />
        </Box>
      ))}
      <AddButton disabled={options.length >= MAX_OPTIONS} onClick={() => onChange([...options, { id: `OPTION_${options.length + 1}`, label: "" }])}>
        Add a button {options.length >= MAX_OPTIONS ? `(max ${MAX_OPTIONS})` : ""}
      </AddButton>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ACTION params editor (key → value rows, "$ref" hints)
// ---------------------------------------------------------------------------

export function ParamsEditor({
  params,
  onChange,
}: {
  params: Record<string, string>;
  onChange: (params: Record<string, string>) => void;
}) {
  const entries = Object.entries(params);

  const rename = (index: number, nextKey: string) => {
    onChange(Object.fromEntries(entries.map(([k, v], i) => [i === index ? nextKey : k, v])));
  };
  const setValue = (index: number, value: string) => {
    onChange(Object.fromEntries(entries.map(([k, v], i) => [k, i === index ? value : v])));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {entries.map(([key, value], index) => (
        <Box key={index} sx={rowSx}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField size="small" fullWidth label="Field" value={key} onChange={(e) => rename(index, e.target.value)} slotProps={monoInput} sx={{ bgcolor: "#fff" }} />
            <RemoveButton title="Remove this field" onClick={() => onChange(Object.fromEntries(entries.filter((_e, i) => i !== index)))} />
          </Box>
          <TextField size="small" fullWidth label="Value" value={value} onChange={(e) => setValue(index, e.target.value)} placeholder="$reason, {reason} or plain text" slotProps={monoInput} sx={{ bgcolor: "#fff" }} />
        </Box>
      ))}
      <AddButton onClick={() => onChange({ ...params, "": "" })}>Pass a field</AddButton>
      <Typography sx={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>
        $reason passes a saved answer as-is · {"{reason}"} puts it inside text · also $candidate, $text, $buttonId, $optionId, $lat, $lng
      </Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Classifier category editor (ASK_TEXT → LLM branching)
// ---------------------------------------------------------------------------

export function ClassifyEditor({
  classify,
  targets,
  onChange,
}: {
  classify: NonNullable<ApiFlowStep["classify"]>;
  targets: string[];
  onChange: (classify: ApiFlowStep["classify"]) => void;
}) {
  const update = (index: number, patch: Partial<{ id: string; description: string; next: string }>) => {
    onChange({
      ...classify,
      categories: classify.categories.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Typography sx={{ fontSize: 12, color: "#64748b" }}>The AI reads the driver&apos;s answer and places it into one of these categories.</Typography>
      {classify.categories.map((category, index) => (
        <Box key={index} sx={rowSx}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              size="small" fullWidth label="Category name" value={category.id}
              onChange={(e) => update(index, { id: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
              slotProps={monoInput} sx={{ bgcolor: "#fff" }}
            />
            <RemoveButton title="Remove this category" disabled={classify.categories.length <= 1} onClick={() => onChange({ ...classify, categories: classify.categories.filter((_c, i) => i !== index) })} />
          </Box>
          <TextField size="small" fullWidth multiline label="The answer sounds like…" value={category.description} onChange={(e) => update(index, { description: e.target.value })} sx={{ bgcolor: "#fff" }} />
          <NextStepSelect label="Then go to" value={category.next} targets={targets} onChange={(next) => update(index, { next: next ?? "" })} />
        </Box>
      ))}
      <AddButton
        disabled={classify.categories.length >= MAX_OPTIONS}
        onClick={() => onChange({ ...classify, categories: [...classify.categories, { id: `CATEGORY_${classify.categories.length + 1}`, description: "", next: "" }] })}
      >
        Add a category
      </AddButton>
      <NextStepSelect label="If the AI is unsure, go to" value={classify.fallback} targets={targets} onChange={(next) => onChange({ ...classify, fallback: next ?? "" })} />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// onText editor — what a typed reply means (ASK_CHOICE free-text branch)
// ---------------------------------------------------------------------------

export function OnTextEditor({
  onText,
  targets,
  intents,
  onChange,
}: {
  onText: NonNullable<ApiFlowStep["onText"]>;
  targets: string[];
  intents: string[];
  onChange: (onText: ApiFlowStep["onText"]) => void;
}) {
  const intentEntries = Object.entries(onText.intentMap ?? {});

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Typography sx={{ fontSize: 12, color: "#64748b" }}>Send typed answers to a step based on what they mean.</Typography>
      {intentEntries.map(([intent, target], index) => (
        <Box key={index} sx={rowSx}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              select size="small" fullWidth label="When the answer means" value={intent} sx={{ bgcolor: "#fff" }}
              onChange={(e) => {
                const next = intentEntries.map(([k, v], i) => (i === index ? [e.target.value, v] : [k, v]));
                onChange({ ...onText, intentMap: Object.fromEntries(next) });
              }}
            >
              {intents.map((i) => (
                <MenuItem key={i} value={i} sx={{ fontFamily: "monospace", fontSize: 12 }}>{i}</MenuItem>
              ))}
            </TextField>
            <RemoveButton title="Remove this meaning" onClick={() => {
              const next = intentEntries.filter((_e, i) => i !== index);
              onChange({ ...onText, intentMap: next.length > 0 ? Object.fromEntries(next) : undefined });
            }} />
          </Box>
          <NextStepSelect
            label="Then go to"
            value={target}
            targets={targets}
            onChange={(next) => {
              const entries = intentEntries.map(([k, v], i) => (i === index ? [k, next ?? ""] : [k, v]));
              onChange({ ...onText, intentMap: Object.fromEntries(entries) });
            }}
          />
        </Box>
      ))}
      <AddButton onClick={() => onChange({ ...onText, intentMap: { ...(onText.intentMap ?? {}), [intents[0] ?? "UNKNOWN"]: "" } })}>Add a meaning</AddButton>
      <NextStepSelect label="Any other typed answer goes to" value={onText.elseNext} targets={targets} allowEmpty onChange={(next) => onChange({ ...onText, elseNext: next })} />
    </Box>
  );
}
