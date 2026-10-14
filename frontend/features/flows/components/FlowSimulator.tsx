// ---------------------------------------------------------------------------
// Simulator panel: a chat-style dry-run of a saved flow version. Every new
// driver input replays the whole input script through POST /:key/simulate —
// nothing touches WhatsApp or real job state.
// ---------------------------------------------------------------------------

"use client";

import * as React from "react";
import { feedback } from "@/shared/feedback/store";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { simulateFlow } from "@/features/flows/api";
import type { ApiFlowSimInput, ApiFlowSimInputType, ApiFlowTranscriptEntry, ApiFlowVersion } from "@/features/flows/types";

const INPUT_TYPES: { value: ApiFlowSimInputType; label: string; placeholder: string }[] = [
  { value: "text", label: "texts", placeholder: "e.g. my truck broke down" },
  { value: "button", label: "taps button", placeholder: "button id, e.g. CANCEL_REASON:PERSONAL" },
  { value: "location", label: "shares location", placeholder: "(a demo location is sent)" },
  { value: "photo", label: "sends a photo", placeholder: "(a demo photo is sent)" },
];

/** The sample facts for a simulation: what the driver is pretending to have said in their first message. */
const startDataFor = (facts: { jobNumber: boolean; reason: boolean }) => ({
  jobReference: facts.jobNumber ? "JOB-SIM-2" : null,
  reason: facts.reason ? "truck broke down" : null,
});

function TranscriptBubble({ entry, onTapButton }: { entry: ApiFlowTranscriptEntry; onTapButton: (id: string) => void }) {
  if (entry.from === "system") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
        <Chip
          size="small"
          variant="outlined"
          label={
            entry.action
              ? `⚙ ${entry.action}${entry.params && Object.keys(entry.params).length > 0 ? ` (${Object.entries(entry.params)
                  .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
                  .join(", ")})` : ""}`
              : entry.text
          }
          sx={{ fontFamily: "monospace", fontSize: 10.5, maxWidth: "100%", height: "auto", py: 0.5, "& .MuiChip-label": { whiteSpace: "normal" } }}
        />
      </Box>
    );
  }

  const isDriver = entry.from === "driver";
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: isDriver ? "flex-end" : "flex-start", my: 0.5 }}>
      <Box
        sx={{
          maxWidth: "85%",
          px: 1.5,
          py: 1,
          borderRadius: 2.5,
          bgcolor: isDriver ? "primary.main" : "action.hover",
          color: isDriver ? "primary.contrastText" : "text.primary",
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {entry.type && entry.type !== "text" ? `[${entry.type}] ` : ""}
          {entry.text}
        </Typography>
      </Box>
      {entry.buttons && entry.buttons.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
          {entry.buttons.map((b) => (
            <Chip key={b.id} size="small" color="primary" variant="outlined" label={b.title} onClick={() => onTapButton(b.id)} sx={{ cursor: "pointer" }} />
          ))}
        </Box>
      )}
      {entry.listRows && entry.listRows.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
          {entry.listRows.map((r) => (
            <Chip key={r.id} size="small" variant="outlined" label={`☰ ${r.title}`} onClick={() => onTapButton(r.id)} sx={{ cursor: "pointer" }} />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function FlowSimulator({
  flowKey,
  versions,
  onError,
}: {
  flowKey: string;
  versions: ApiFlowVersion[];
  onError: (message: string) => void;
}) {
  const hasIf = versions.some((v) => v.definition.steps.some((st) => st.type === "IF"));
  const draft = versions.find((v) => v.status === "DRAFT");
  const published = versions.find((v) => v.status === "PUBLISHED");
  const [version, setVersion] = React.useState(() => (draft ?? published ?? versions[0])?.version ?? 1);
  const [inputs, setInputs] = React.useState<ApiFlowSimInput[]>([]);
  const [transcript, setTranscript] = React.useState<ApiFlowTranscriptEntry[]>([]);
  const [waitingAt, setWaitingAt] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(true); // the first run starts when the panel opens
  const [inputType, setInputType] = React.useState<ApiFlowSimInputType>("text");
  const [value, setValue] = React.useState("");
  // What the bot already knows when this conversation starts: only matters when the conversation has an IF step.
  const [facts, setFacts] = React.useState({ jobNumber: false, reason: false });
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const run = React.useCallback(
    async (script: ApiFlowSimInput[], ver: number, known = facts) => {
      setRunning(true);
      try {
        const result = await simulateFlow(flowKey, { version: ver, inputs: script, startData: startDataFor(known) });
        feedback.info("Simulation updated. No real jobs or WhatsApp messages were changed.");
        setTranscript(result.transcript);
        setWaitingAt(result.waitingAt);
      } catch (err) {
        onError(err instanceof Error ? err.message : "The simulation failed.");
      } finally {
        setRunning(false);
      }
    },
    [flowKey, onError, facts]
  );

  // The first run, when the panel opens. Later runs follow what the person does (a version, a reset, a message).
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await simulateFlow(flowKey, { version, inputs: [], startData: startDataFor(facts) });
        if (cancelled) return;
        setTranscript(result.transcript);
        setWaitingAt(result.waitingAt);
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : "The simulation failed.");
      } finally {
        if (!cancelled) setRunning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [transcript]);

  const send = (type: ApiFlowSimInputType, inputValue: string) => {
    const next = [...inputs, { type, value: inputValue }];
    setInputs(next);
    setValue("");
    void run(next, version);
  };

  const composer = INPUT_TYPES.find((t) => t.value === inputType) ?? INPUT_TYPES[0];
  const needsValue = inputType === "text" || inputType === "button";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 360 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
        <TextField
          select size="small" label="Version" value={version}
          onChange={(e) => { const next = Number(e.target.value); setInputs([]); setVersion(next); void run([], next); }}
          sx={{ minWidth: 150 }}
        >
          {versions.map((v) => (
            <MenuItem key={v.version} value={v.version}>
              v{v.version} · {v.status.toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
        {hasIf && (
          <>
            <FormControlLabel
              control={<Checkbox size="small" checked={facts.jobNumber} onChange={(e) => { const next = { ...facts, jobNumber: e.target.checked }; setFacts(next); setInputs([]); void run([], version, next); }} />}
              label={<Typography variant="caption">Driver named a job</Typography>} sx={{ mr: 1 }}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={facts.reason} onChange={(e) => { const next = { ...facts, reason: e.target.checked }; setFacts(next); setInputs([]); void run([], version, next); }} />}
              label={<Typography variant="caption">Driver gave a reason</Typography>} sx={{ mr: 1 }}
            />
          </>
        )}
        {waitingAt && <Chip size="small" color="info" variant="outlined" label={`waiting at ${waitingAt}`} sx={{ fontFamily: "monospace" }} />}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Restart the conversation">
          <span>
            <IconButton size="small" disabled={running} onClick={() => { setInputs([]); void run([], version); }}>
              <RestartAltRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: 1.5,
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {transcript.length === 0 && !running && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            The bot said nothing — this flow may wait for input first. Type a driver reply below.
          </Typography>
        )}
        {transcript.map((entry, index) => (
          <TranscriptBubble key={index} entry={entry} onTapButton={(id) => send("button", id)} />
        ))}
        {running && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
            <CircularProgress size={18} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center" }}>
        <TextField
          select size="small" value={inputType}
          onChange={(e) => setInputType(e.target.value as ApiFlowSimInputType)}
          sx={{ minWidth: 140 }}
          label="Driver"
        >
          {INPUT_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small" fullWidth value={value}
          placeholder={composer.placeholder}
          disabled={!needsValue}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && needsValue && value.trim()) send(inputType, value.trim());
          }}
        />
        <Button
          variant="contained" size="small"
          disabled={running || (needsValue && !value.trim())}
          onClick={() => send(inputType, needsValue ? value.trim() : "")}
          endIcon={<SendRoundedIcon />}
          sx={{ whiteSpace: "nowrap" }}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
}
