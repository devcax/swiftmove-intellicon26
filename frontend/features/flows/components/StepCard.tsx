// ---------------------------------------------------------------------------
// The settings form for one step, shown in the canvas side panel. Fields are
// grouped into labelled sections (what the driver sees, what it saves, where
// it goes next) with technical settings tucked under "Advanced". Branching
// fields are dropdowns over the flow's steps so a manager can never point at
// a step that doesn't exist.
// ---------------------------------------------------------------------------

"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import type { ApiFlowDefinition, ApiFlowStep, ApiFlowMeta } from "@/features/flows/types";
import { STEP_ID_PATTERN, STEP_TYPE_META, targetOptions } from "../model";
import { ClassifyEditor, NextStepSelect, OnTextEditor, OptionsEditor, ParamsEditor, StepNamesContext } from "./stepEditors";

const VARIABLE_HINT = "Use {reason} to insert a saved answer, or {reason|lower} for lowercase.";
const monoInput = { htmlInput: { style: { fontFamily: "monospace", fontSize: 12.5 } } };

/** A group of related fields under a small heading. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#64748b" }}>{title}</Typography>
      {children}
    </Box>
  );
}

/** One field with its label above it and an optional hint below, so every input lines up on the left edge. */
function Field({ label, hint, htmlFor, children }: { label: string; hint?: React.ReactNode; htmlFor?: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography component="label" htmlFor={htmlFor} sx={{ display: "block", mb: 0.75, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{label}</Typography>
      {children}
      {hint && <Typography sx={{ mt: 0.75, fontSize: 11.5, lineHeight: 1.5, color: "#64748b" }}>{hint}</Typography>}
    </Box>
  );
}

function TextInput({ id, value, onChange, multiline, placeholder, mono, error, helperText }: {
  id: string; value: string; onChange: (value: string) => void; multiline?: boolean; placeholder?: string; mono?: boolean; error?: boolean; helperText?: string;
}) {
  return (
    <TextField
      id={id} size="small" fullWidth value={value} placeholder={placeholder} error={error} helperText={helperText}
      multiline={multiline} minRows={multiline ? 3 : undefined}
      onChange={(e) => onChange(e.target.value)}
      slotProps={mono ? monoInput : undefined}
    />
  );
}

export default function StepCard({
  definition,
  step,
  index,
  meta,
  issues,
  canRemove,
  onChange,
  onRemove,
}: {
  definition: ApiFlowDefinition;
  step: ApiFlowStep;
  index: number;
  meta: ApiFlowMeta;
  issues: string[];
  canRemove: boolean;
  onChange: (next: ApiFlowStep) => void;
  onRemove: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const patch = (p: Partial<ApiFlowStep>) => onChange({ ...step, ...p });
  const targets = targetOptions(definition, step.id);
  const names = React.useMemo(() => new Map(definition.steps.map((item) => [item.id, STEP_TYPE_META[item.type]?.label ?? item.type])), [definition]);
  const typeMeta = STEP_TYPE_META[step.type];
  const isAsk = step.type.startsWith("ASK_");
  const field = (name: string) => `step-${index}-${name}`;

  const idValid = STEP_ID_PATTERN.test(step.id);
  const idTaken = definition.steps.some((s, i) => i !== index && s.id === step.id);

  const routingMode: "next" | "onText" | "classify" =
    step.classify != null ? "classify" : step.onText != null ? "onText" : "next";

  const question = (
    <Field label="Question to the driver" htmlFor={field("text")} hint={VARIABLE_HINT}>
      <TextInput id={field("text")} multiline value={step.text ?? ""} placeholder="Type the question…" onChange={(text) => patch({ text: text || undefined })} />
    </Field>
  );
  const saveAs = (label: string) => (
    <Field label={label} htmlFor={field("saveAs")} hint={step.saveAs ? `Use it later as {${step.saveAs}}.` : "Optional. Give it a short name to reuse the answer later."}>
      <TextInput id={field("saveAs")} mono value={step.saveAs ?? ""} placeholder="e.g. reason" onChange={(value) => patch({ saveAs: value || undefined })} />
    </Field>
  );
  const nudge = (
    <Field label="If the driver sends something else, reply" htmlFor={field("reprompt")}>
      <TextInput id={field("reprompt")} value={step.reprompt ?? ""} placeholder="e.g. Please share your location using the 📎 button." onChange={(value) => patch({ reprompt: value || undefined })} />
    </Field>
  );
  const next = (label = "Then go to") => (
    <Field label={label}>
      <NextStepSelect label="" value={step.next} targets={targets} onChange={(value) => patch({ next: value })} />
    </Field>
  );

  return (
    <StepNamesContext.Provider value={names}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Typography sx={{ fontSize: 13, lineHeight: 1.5, color: "#475569" }}>{typeMeta.hint}</Typography>
        {issues.length > 0 && (
          <Alert severity="error" variant="outlined" sx={{ py: 0.5 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>Fix before publishing</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, fontSize: 12.5 }}>{issues.map((issue, at) => <li key={at}>{issue}</li>)}</Box>
          </Alert>
        )}

        {step.type === "SAY" && (
          <>
            <Section title="Message">
              <Field label="Message to the driver" htmlFor={field("text")} hint={VARIABLE_HINT}>
                <TextInput id={field("text")} multiline value={step.text ?? ""} placeholder="Type the message…" onChange={(text) => patch({ text })} />
              </Field>
            </Section>
            <Divider />
            <Section title="Next step">{next()}</Section>
          </>
        )}

        {step.type === "ASK_CHOICE" && (
          <>
            <Section title="Question">
              {question}
              {meta.promptProviders.length > 0 && (
                <Field label="Or build the question from live data" htmlFor={field("promptFrom")}>
                  <TextField id={field("promptFrom")} select size="small" fullWidth value={step.promptFrom ?? ""} onChange={(e) => patch({ promptFrom: e.target.value || undefined })} slotProps={{ select: { displayEmpty: true } }}>
                    <MenuItem value=""><em>Use the question above</em></MenuItem>
                    {meta.promptProviders.map((p) => <MenuItem key={p.name} value={p.name}>{p.label}</MenuItem>)}
                  </TextField>
                </Field>
              )}
            </Section>
            <Divider />
            <Section title="Answer buttons">
              <OptionsEditor options={step.options ?? []} targets={targets} onChange={(options) => patch({ options })} />
            </Section>
          </>
        )}

        {step.type === "ASK_TEXT" && (
          <>
            <Section title="Question">
              <FormControlLabel
                sx={{ mx: 0, gap: 1 }}
                control={<Checkbox size="small" sx={{ p: 0 }} checked={step.sendText !== false} onChange={(e) => patch({ sendText: e.target.checked ? undefined : false })} />}
                label={<Typography sx={{ fontSize: 13 }}>Send a question (turn off when an earlier step already asked)</Typography>}
              />
              {step.sendText !== false && question}
            </Section>
            <Divider />
            <Section title="Answer">{saveAs("Save the answer as")}</Section>
            <Divider />
            <Section title="Next step">
              <Field label="Where the answer goes" htmlFor={field("routing")}>
                <TextField
                  id={field("routing")} select size="small" fullWidth value={routingMode}
                  onChange={(e) => {
                    const mode = e.target.value as "next" | "onText" | "classify";
                    if (mode === "next") patch({ onText: undefined, classify: undefined, next: step.next ?? targets[0] });
                    if (mode === "onText") patch({ onText: { intentMap: { UNKNOWN: "" } }, classify: undefined, next: undefined });
                    if (mode === "classify") patch({ classify: { categories: [{ id: "CATEGORY_1", description: "", next: "" }], fallback: "" }, onText: undefined, next: undefined });
                  }}
                >
                  <MenuItem value="next">Always to the same step</MenuItem>
                  <MenuItem value="onText">By what it means (intent)</MenuItem>
                  <MenuItem value="classify">Into AI categories I define</MenuItem>
                </TextField>
              </Field>
              {routingMode === "next" && next()}
              {routingMode === "onText" && <OnTextEditor onText={step.onText ?? {}} targets={targets} intents={meta.intents} onChange={(onText) => patch({ onText })} />}
              {routingMode === "classify" && step.classify && <ClassifyEditor classify={step.classify} targets={targets} onChange={(classify) => patch({ classify })} />}
            </Section>
          </>
        )}

        {(step.type === "ASK_LOCATION" || step.type === "ASK_PHOTO") && (
          <>
            <Section title="Question">
              {question}
              {nudge}
            </Section>
            <Divider />
            <Section title="Answer">{saveAs(step.type === "ASK_PHOTO" ? "Save the photo as" : "Save the location as")}</Section>
            <Divider />
            <Section title="Next step">{next()}</Section>
            {step.type === "ASK_LOCATION" && (
              <>
                <Divider />
                <Section title="Quick-reply buttons (optional)">
                  <OptionsEditor options={step.options ?? []} targets={targets} onChange={(options) => patch({ options: options.length > 0 ? options : undefined })} />
                </Section>
              </>
            )}
          </>
        )}

        {step.type === "ACTION" && (
          <>
            <Section title="Action">
              <Field label="What the system does" htmlFor={field("action")}>
                <TextField id={field("action")} select size="small" fullWidth value={step.name ?? ""} onChange={(e) => patch({ name: e.target.value })} slotProps={{ select: { displayEmpty: true } }}>
                  <MenuItem value="" disabled><em>Choose an action</em></MenuItem>
                  {meta.actions.map((a) => <MenuItem key={a.name} value={a.name}>{a.label}</MenuItem>)}
                </TextField>
              </Field>
              <Field label="Data passed to the action">
                <ParamsEditor params={(step.params as Record<string, string>) ?? {}} onChange={(params) => patch({ params: Object.keys(params).length > 0 ? params : undefined })} />
              </Field>
            </Section>
            <Divider />
            <Section title="Next step">
              <Field label="Then go to" hint="Used when the action doesn't decide the next step itself.">
                <NextStepSelect label="" value={step.next} targets={targets} allowEmpty onChange={(value) => patch({ next: value })} />
              </Field>
            </Section>
          </>
        )}

        {step.type === "IF" && (
          <>
            <Section title="Condition">
              <Field label="Check whether" htmlFor={field("check")} hint="Nothing is sent to the driver. The conversation just continues on the Yes or No path.">
                <TextField id={field("check")} select size="small" fullWidth value={step.check ?? ""} onChange={(e) => patch({ check: e.target.value })} slotProps={{ select: { displayEmpty: true } }}>
                  <MenuItem value="" disabled><em>Choose a condition</em></MenuItem>
                  {meta.conditions.map((c) => <MenuItem key={c.name} value={c.name}>{c.label}</MenuItem>)}
                </TextField>
              </Field>
            </Section>
            <Divider />
            <Section title="Paths">
              <Field label="If yes, go to"><NextStepSelect label="" value={step.then} targets={targets} onChange={(then) => patch({ then })} /></Field>
              <Field label="If no, go to"><NextStepSelect label="" value={step.else} targets={targets} onChange={(value) => patch({ else: value })} /></Field>
            </Section>
          </>
        )}

        {step.type === "END" && (
          <Section title="Goodbye">
            <Field label="Final message (optional)" htmlFor={field("text")} hint={VARIABLE_HINT}>
              <TextInput id={field("text")} multiline value={step.text ?? ""} placeholder="e.g. Thanks, we have everything we need." onChange={(text) => patch({ text })} />
            </Field>
          </Section>
        )}

        <Divider />
        <Box>
          <Button
            fullWidth onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen}
            endIcon={<ExpandMoreRoundedIcon sx={{ transform: advancedOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />}
            sx={{ justifyContent: "space-between", px: 0, color: "#334155", fontWeight: 700, fontSize: 13, "&:hover": { bgcolor: "transparent", color: "primary.main" } }}
          >
            Advanced settings
          </Button>
          <Collapse in={advancedOpen}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
              <Field label="Step ID" htmlFor={field("id")} hint="Links between steps use this. Lowercase letters, digits, - and _.">
                <TextInput
                  id={field("id")} mono value={step.id} onChange={(value) => patch({ id: value.trim() })}
                  error={!idValid || idTaken} helperText={!idValid ? "Use lowercase letters, digits, - and _" : idTaken ? "Another step already uses this ID" : undefined}
                />
              </Field>
              {step.type === "ASK_CHOICE" && (
                <>
                  <Field label="Save the tapped button as" htmlFor={field("saveAs")}>
                    <TextInput id={field("saveAs")} mono value={step.saveAs ?? ""} placeholder="e.g. choice" onChange={(value) => patch({ saveAs: value || undefined })} />
                  </Field>
                  <FormControlLabel
                    sx={{ mx: 0, gap: 1 }}
                    control={<Checkbox size="small" sx={{ p: 0 }} checked={step.onText != null} onChange={(e) => patch({ onText: e.target.checked ? { next: targets[0] } : undefined })} />}
                    label={<Typography sx={{ fontSize: 13 }}>Also accept a typed answer</Typography>}
                  />
                  {step.onText != null && (
                    <>
                      <OnTextEditor onText={step.onText} targets={targets} intents={meta.intents} onChange={(onText) => patch({ onText })} />
                      <Field label="Save the typed answer as" htmlFor={field("typedSaveAs")}>
                        <TextInput id={field("typedSaveAs")} mono value={step.onText.saveAs ?? ""} onChange={(value) => patch({ onText: { ...(step.onText ?? {}), saveAs: value || undefined } })} />
                      </Field>
                    </>
                  )}
                </>
              )}
              {isAsk && (
                <>
                  <Field label="Stop the conversation when the driver says" htmlFor={field("cancelPattern")} hint="A pattern (regex), e.g. never mind|forget it">
                    <TextInput id={field("cancelPattern")} mono value={step.cancelPattern ?? ""} placeholder="never mind|forget it" onChange={(value) => patch({ cancelPattern: value || undefined })} />
                  </Field>
                  <Field label="Reply when stopping" htmlFor={field("cancelText")}>
                    <TextInput id={field("cancelText")} value={step.cancelText ?? ""} placeholder="e.g. No problem, I've stopped here." onChange={(value) => patch({ cancelText: value || undefined })} />
                  </Field>
                </>
              )}
            </Box>
          </Collapse>
        </Box>

        <Divider />
        <Button
          variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} disabled={!canRemove} onClick={onRemove}
          sx={{ alignSelf: "flex-start" }}
        >
          {canRemove ? "Delete this step" : "Keep one End step to finish the conversation"}
        </Button>
      </Box>
    </StepNamesContext.Provider>
  );
}
