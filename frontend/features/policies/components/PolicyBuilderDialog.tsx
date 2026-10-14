"use client";

// ---------------------------------------------------------------------------
// PolicyBuilderDialog — the manual rule builder ("When / What / If missing")
// used for both creating a rule by hand and editing an existing one as a new
// version. Only capabilities the backend registry declares available are
// offered; every checked requirement must hold (the AI author path can also
// produce any/not trees). Raw DSL is shown only in the advanced preview.
// ---------------------------------------------------------------------------

import * as React from "react";
import { PolicyEditorFrame } from "./PolicyEditorFrame";
import { feedback } from "@/shared/feedback/store";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { createPolicy, PolicyApiError, revisePolicy } from "@/features/policies/api";
import {
  BLOCK_MODE_META,
  INCIDENT_TYPE_OPTIONS,
  MILESTONE_OPTIONS,
  POLICY_ACTORS,
  POLICY_SOURCES,
  STAGE_OPTIONS,
} from "@/features/policies/constants";
import { defaultParamsFor, labelize } from "@/features/policies/utils";
import type { ApiCapability, ApiCapabilityParam, ApiPolicy, ApiPolicyAction, ApiPolicyBlockMode, ApiPolicyRuleNode } from "@/features/policies/types";
import type { ApiFlowSummary } from "@/features/flows/types";

interface RequirementState {
  enabled: boolean;
  params: Record<string, unknown>;
}

const MATCH_OPTIONS: Record<string, readonly string[]> = {
  source: POLICY_SOURCES,
  actor: POLICY_ACTORS,
  milestone: MILESTONE_OPTIONS,
  stage: STAGE_OPTIONS,
  incidentType: INCIDENT_TYPE_OPTIONS,
};

const MATCH_LABELS: Record<string, string> = {
  source: "Where the action comes from",
  actor: "Who triggers the action",
  milestone: "Only for the milestone",
  stage: "Only for the document",
  incidentType: "Only for the incident type",
};

function EditorSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Box component="section" sx={{ borderTop: '1px solid #e2e8f0', pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <Box>
      <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, color: '#0f172a', mb: 0.75 }}>{title}</Typography>
      <Typography sx={{ fontSize: 13, lineHeight: 1.7, color: '#475569', maxWidth: 800 }}>{description}</Typography>
    </Box>
    {children}
  </Box>;
}

function initialRequirements(base: ApiPolicy | undefined, capabilities: ApiCapability[]): Record<string, RequirementState> {
  const state: Record<string, RequirementState> = {};
  const leaves: ApiPolicyRuleNode[] = [];
  const walk = (node: ApiPolicyRuleNode | null | undefined) => {
    if (!node) return;
    if (typeof node.requirement === "string") {
      leaves.push(node);
      return;
    }
    for (const child of node.all ?? []) walk(child);
    for (const child of node.any ?? []) walk(child);
    if (node.not) walk(node.not);
  };
  walk(base?.rule ?? null);
  for (const cap of capabilities) {
    const leaf = leaves.find((l) => l.requirement === cap.name);
    state[cap.name] = {
      enabled: Boolean(leaf),
      params: leaf?.params ? { ...leaf.params } : defaultParamsFor(cap),
    };
  }
  return state;
}

function ParamEditor({
  param,
  value,
  onChange,
}: {
  param: ApiCapabilityParam;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  switch (param.kind) {
    case "enum":
      return (
        <TextField
          select size="small" label={param.label} value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 200 }}
        >
          {(param.values ?? []).map((v) => (
            <MenuItem key={v} value={v}>{labelize(v)}</MenuItem>
          ))}
        </TextField>
      );
    case "enumList": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{labelize(param.label)}:</Typography>
          <Box className="flex flex-wrap">
            {(param.values ?? []).map((v) => (
              <FormControlLabel
                key={v}
                control={
                  <Checkbox
                    size="small"
                    checked={selected.includes(v)}
                    onChange={(e) =>
                      onChange(e.target.checked ? [...selected, v] : selected.filter((s) => s !== v))
                    }
                  />
                }
                label={<Typography variant="body2">{labelize(v)}</Typography>}
                sx={{ width: { xs: "50%", sm: "33%" }, mr: 0 }}
              />
            ))}
          </Box>
        </Box>
      );
    }
    case "number":
      return (
        <TextField
          type="number" size="small" label={param.label} value={Number(value ?? param.min ?? 1)}
          helperText={param.description}
          onChange={(e) => onChange(Number(e.target.value))}
          slotProps={{ htmlInput: { min: param.min, max: param.max, step: 1 } }} sx={{ width: '100%', maxWidth: 400 }}
        />
      );
    case "boolean":
      return (
        <FormControlLabel
          control={<Checkbox size="small" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />}
          label={<Typography variant="body2">{param.label}</Typography>}
        />
      );
    case "gateMap": {
      const gates = (value as Record<string, string>) ?? {};
      const toggle = (milestone: string, stage: string, on: boolean) => {
        const next = { ...gates };
        if (on) next[milestone] = stage;
        else delete next[milestone];
        onChange(next);
      };
      return (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Gated milestones:</Typography>
          <Box className="flex flex-wrap">
            <FormControlLabel
              control={<Checkbox size="small" checked={Boolean(gates.LOADED)} onChange={(e) => toggle("LOADED", "PICKUP", e.target.checked)} />}
              label={<Typography variant="body2">Loaded needs the verified pickup document</Typography>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={Boolean(gates.DELIVERED)} onChange={(e) => toggle("DELIVERED", "DELIVERY", e.target.checked)} />}
              label={<Typography variant="body2">Delivered needs the verified delivery document</Typography>}
            />
          </Box>
        </Box>
      );
    }
    default:
      return (
        <TextField
          size="small" label={param.label} value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 220 }}
        />
      );
  }
}

export default function PolicyBuilderDialog({
  mode,
  base,
  embedded = false,
  capabilities,
  actions,
  flows,
  onClose,
  onSaved,
}: {
  mode: "create" | "revise";
  base?: ApiPolicy;
  embedded?: boolean;
  capabilities: ApiCapability[];
  actions: ApiPolicyAction[];
  flows: ApiFlowSummary[];
  onClose: () => void;
  onSaved: (policy: ApiPolicy, verb: string) => void;
}) {
  // Mounted only while open (parent renders conditionally) — lazy initializers
  // capture the base policy, no sync effect needed.
  const [name, setName] = React.useState(() => base?.name ?? "");
  const [description, setDescription] = React.useState(() => base?.description ?? "");
  const [action, setAction] = React.useState(() => base?.action ?? actions[0]?.name ?? "");
  const [match, setMatch] = React.useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(base?.match ?? {})) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  });
  const [requirements, setRequirements] = React.useState<Record<string, RequirementState>>(() =>
    initialRequirements(base, capabilities)
  );
  const [blockMode, setBlockMode] = React.useState<ApiPolicyBlockMode>(() => base?.onBlock?.mode ?? "BLOCK");
  const [message, setMessage] = React.useState(() => base?.onBlock?.message ?? "");
  const [flowKey, setFlowKey] = React.useState(() => base?.onBlock?.flowKey ?? "");
  const [advanced, setAdvanced] = React.useState(false);
  const [issues, setIssues] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [showAllRequirements, setShowAllRequirements] = React.useState(mode === 'create');

  const availableCaps = capabilities.filter((c) => c.available !== false);
  const actionMeta = actions.find((a) => a.name === action);
  const matchFields = ["source", "actor", ...(actionMeta?.matchFields ?? [])];

  const enabledLeaves: ApiPolicyRuleNode[] = availableCaps
    .filter((c) => requirements[c.name]?.enabled)
    .map((c) => {
      const params = requirements[c.name].params;
      const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
      return Object.keys(clean).length > 0 ? { requirement: c.name, params: clean } : { requirement: c.name };
    });
  const rule: ApiPolicyRuleNode | null =
    enabledLeaves.length === 0 ? null : enabledLeaves.length === 1 ? enabledLeaves[0] : { all: enabledLeaves };

  const cleanMatch = Object.fromEntries(Object.entries(match).filter(([, v]) => v !== ""));
  const payloadPreview = {
    name, action, match: cleanMatch, rule,
    onBlock: {
      mode: blockMode,
      ...(message.trim() ? { message: message.trim() } : {}),
      ...(flowKey ? { flowKey } : {}),
    },
  };

  const submit = async () => {
    setSaving(true);
    setIssues([]);
    try {
      const onBlock = payloadPreview.onBlock;
      const saved =
        mode === "revise" && base
          ? await revisePolicy(base.id, {
              name: name.trim(),
              description: description.trim() || null,
              match: cleanMatch,
              rule: rule ?? undefined,
              onBlock,
            })
          : await createPolicy({
              name: name.trim(),
              description: description.trim() || null,
              action,
              match: cleanMatch,
              rule: rule as ApiPolicyRuleNode,
              onBlock,
            });
      onSaved(saved, mode === "revise" ? "saved as a new draft version" : "created as a draft");
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : "Could not save the rule.");
      if (err instanceof PolicyApiError && err.issues.length > 0) setIssues(err.issues);
      else setIssues([err instanceof Error ? err.message : "Could not save the rule."]);
      setSaving(false);
    }
  };

  return (
    <PolicyEditorFrame
      embedded={embedded}
      onClose={onClose}
      title={mode === "revise" ? `Edit “${base?.name}”` : "Build the rule yourself"}
      actions={<>
        <Button disabled={saving} onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" onClick={submit}
          disabled={saving || name.trim().length < 3 || !rule}
        >
          {saving ? "Saving…" : "Save draft version"}
        </Button>
      </>}
    >
        <EditorSection title="1. Rule details" description="Give this rule a clear name and explain what it controls.">
        <TextField label="Rule name" size="small" value={name} fullWidth onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Purpose of this rule (optional)" size="small" value={description} fullWidth
          multiline minRows={2} onChange={(e) => setDescription(e.target.value)}
        />
        </EditorSection>

        <EditorSection title="2. When this rule applies" description="Review the action this rule checks. Optional filters limit it to particular people, channels, or situations.">
        <TextField
          select size="small" label="Action this rule checks" value={action} disabled={mode === 'revise'}
          onChange={(e) => {
            setAction(e.target.value);
            setMatch({});
          }}
          sx={{ width: '100%', maxWidth: 640 }}
          helperText={actionMeta?.description}
        >
          {actions.filter((a) => a.name !== "conversation.receive").map((a) => (
            <MenuItem key={a.name} value={a.name}>{a.label}</MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
          {matchFields.map((field) => (
            <TextField
              key={field} select size="small" label={MATCH_LABELS[field] ?? labelize(field)}
              value={match[field] ?? ""} fullWidth
              onChange={(e) => setMatch((m) => ({ ...m, [field]: e.target.value }))}
            >
              <MenuItem value=""><em>Any / no restriction</em></MenuItem>
              {(MATCH_OPTIONS[field] ?? []).map((v) => (
                <MenuItem key={v} value={v}>{labelize(v)}</MenuItem>
              ))}
            </TextField>
          ))}
        </Box>
        </EditorSection>

        <EditorSection title="3. Requirements to meet" description="Every selected requirement must pass. Edit the values below, or add another requirement if the rule needs an extra check.">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {availableCaps.filter(cap => showAllRequirements || requirements[cap.name]?.enabled).map((cap) => {
            const state = requirements[cap.name] ?? { enabled: false, params: {} };
            return (
              <Box
                key={cap.name}
                sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: state.enabled ? "#1e3a8a" : "#e2e8f0" }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small" checked={state.enabled}
                      onChange={(e) =>
                        setRequirements((r) => ({ ...r, [cap.name]: { ...state, enabled: e.target.checked } }))
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{cap.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{cap.description}</Typography>
                    </Box>
                  }
                />
                {state.enabled && cap.params.length > 0 && (
                  <Box sx={{ pl: 4.5, pt: 0.5, display: "flex", flexDirection: "column", gap: 1 }}>
                    {cap.params.map((p) => (
                      <ParamEditor
                        key={p.name} param={cap.name === 'pickup_within_hours' && p.name === 'hours' ? {
                          ...p, label: 'Pickup window (hours before pickup)',
                          description: '24 hours = 1 day · 48 hours = 2 days · 168 hours = 7 days. Measured from now to scheduled pickup.',
                        } : p}
                        value={state.params[p.name]}
                        onChange={(next) =>
                          setRequirements((r) => ({
                            ...r,
                            [cap.name]: { ...state, params: { ...state.params, [p.name]: next } },
                          }))
                        }
                      />
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
        <Box><Button variant="outlined" size="small" onClick={() => setShowAllRequirements(value => !value)}>
          {showAllRequirements ? 'Show selected requirements only' : 'Add another requirement'}
        </Button></Box>
        {enabledLeaves.length === 0 && (
          <Alert severity="warning" sx={{ py: 0 }}>Check at least one requirement, or the rule can never be satisfied.</Alert>
        )}
        </EditorSection>

        <EditorSection title="4. What happens when a requirement fails" description="Choose whether the action is blocked or needs attention, what the driver sees, and which conversation helps them continue.">
        <TextField
          select size="small" label="When the requirement is not met" value={blockMode}
          onChange={(e) => setBlockMode(e.target.value as ApiPolicyBlockMode)} sx={{ width: '100%', maxWidth: 640 }}
        >
          {(Object.keys(BLOCK_MODE_META) as ApiPolicyBlockMode[]).map((modeOption) => (
            <MenuItem key={modeOption} value={modeOption}>
              {BLOCK_MODE_META[modeOption].label} — {BLOCK_MODE_META[modeOption].description}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Message shown to the driver (optional)"
          helperText="Leave empty to let the bot explain the requirement that failed."
          size="small" value={message} fullWidth multiline minRows={2}
          onChange={(e) => setMessage(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        <TextField
          select size="small" label="Conversation used to collect what is missing" value={flowKey}
          onChange={(e) => setFlowKey(e.target.value)} sx={{ maxWidth: 420 }}
        >
          <MenuItem value="">Standard helper (explains, collects evidence, retries)</MenuItem>
          {flows.map((f) => (
            <MenuItem key={f.key} value={f.key}>{f.name}</MenuItem>
          ))}
        </TextField>
        </EditorSection>

        <Box>
          <Button size="small" variant="text" onClick={() => setAdvanced((a) => !a)}>
            {advanced ? "Hide technical preview" : "Advanced (technical preview)"}
          </Button>
          <Collapse in={advanced}>
            <Box
              component="pre"
              sx={{ m: 0, mt: 1, p: 1.5, borderRadius: 2, bgcolor: "#0f172a", color: "#e2e8f0", fontSize: 11.5, fontFamily: "monospace", overflowX: "auto", maxHeight: 260 }}
            >
              {JSON.stringify(payloadPreview, null, 2)}
            </Box>
          </Collapse>
        </Box>

        {issues.length > 0 && (
          <Alert severity="error">
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {issues.map((issue, i) => (
                <li key={i}><Typography variant="caption">{issue}</Typography></li>
              ))}
            </Box>
          </Alert>
        )}
    </PolicyEditorFrame>
  );
}
