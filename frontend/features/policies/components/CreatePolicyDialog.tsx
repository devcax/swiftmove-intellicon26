"use client";

// ---------------------------------------------------------------------------
// CreatePolicyDialog — "Create an operational rule". The manager describes
// the rule in plain words; the AI drafts it using ONLY the supported
// capabilities and the backend validates it independently. The result is
// always a draft — nothing goes live without an explicit publish. A manual
// builder is offered as the second path.
// ---------------------------------------------------------------------------

import * as React from "react";
import { PolicyEditorFrame } from "./PolicyEditorFrame";
import { feedback } from "@/shared/feedback/store";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import HandymanRoundedIcon from "@mui/icons-material/HandymanRounded";
import PolicySections from "@/features/policies/components/PolicySections";
import { draftPolicy, PolicyApiError, publishPolicy } from "@/features/policies/api";
import type { ApiCapability, ApiPolicy, ApiPolicyAction, ApiPolicyUnsupported } from "@/features/policies/types";
import type { ApiFlowSummary } from "@/features/flows/types";

const EXAMPLES = [
  "A driver can only request a job if their account is active",
  "Block trip progress if the driver has not started the job",
  "Only delivered jobs may be sent for closure",
];

export default function CreatePolicyDialog({
  embedded = false,
  capabilities,
  actions,
  flows,
  onClose,
  onSaved,
  onManual,
}: {
  embedded?: boolean;
  capabilities: ApiCapability[];
  actions: ApiPolicyAction[];
  flows: ApiFlowSummary[];
  onClose: () => void;
  onSaved: (policy: ApiPolicy, verb: string) => void;
  onManual: () => void;
}) {
  const [instruction, setInstruction] = React.useState("");
  const [drafting, setDrafting] = React.useState(false);
  const [issues, setIssues] = React.useState<string[]>([]);
  const [unsupported, setUnsupported] = React.useState<ApiPolicyUnsupported[]>([]);
  const [draft, setDraft] = React.useState<ApiPolicy | null>(null);
  const [publishing, setPublishing] = React.useState(false);

  const unavailable = capabilities.filter((c) => c.available === false);

  const submit = async () => {
    setDrafting(true);
    setIssues([]);
    setUnsupported([]);
    try {
      const result = await draftPolicy({ instruction: instruction.trim() });
      setDraft(result.policy);
      feedback.success("AI policy draft created. Review it before publishing.");
      setUnsupported(result.unsupported ?? []);
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : "Could not draft the rule.");
      if (err instanceof PolicyApiError) {
        setIssues(err.issues.length > 0 ? err.issues : [err.message]);
        setUnsupported(err.unsupported);
      } else {
        setIssues([err instanceof Error ? err.message : "Could not draft the rule."]);
      }
    } finally {
      setDrafting(false);
    }
  };

  const publishNow = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      const published = await publishPolicy(draft.id);
      onSaved(published, "published");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not publish the draft.";
      setIssues([message]); feedback.error(message);
      setPublishing(false);
    }
  };

  return (
    <PolicyEditorFrame
      embedded={embedded}
      onClose={onClose}
      title={"Draft with AI"}
      actions={<>
        {!draft && (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained" startIcon={<AutoAwesomeRoundedIcon />}
              disabled={drafting || instruction.trim().length < 10}
              onClick={submit}
            >
              {drafting ? "Drafting…" : "Draft the rule"}
            </Button>
          </>
        )}
        {draft && (
          <>
            <Button onClick={() => { setDraft(null); setIssues([]); }} disabled={publishing}>
              Rephrase
            </Button>
            <Button variant="outlined" disabled={publishing} onClick={() => onSaved(draft, "saved as a draft")}>
              Keep as draft
            </Button>
            <Button variant="contained" disabled={publishing} onClick={publishNow}>
              {publishing ? "Publishing…" : "Publish now"}
            </Button>
          </>
        )}
      </>}
    >
        {!draft && (
          <>
            <Typography variant="body2" color="text.secondary">
              Describe the rule in plain business words. The AI turns it into a draft using only the
              checks the system can really run — you review it and publish it when you are happy.
              Nothing goes live automatically.
            </Typography>
            <TextField
              size="small" label="Your rule, in plain words" value={instruction} fullWidth
              multiline minRows={3} autoFocus
              placeholder={`e.g. "${EXAMPLES[0]}"`}
              onChange={(e) => setInstruction(e.target.value)}
            />
            <Box className="flex flex-wrap gap-1">
              {EXAMPLES.map((example) => (
                <Button key={example} size="small" variant="text" onClick={() => setInstruction(example)}>
                  {example}
                </Button>
              ))}
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
            {unsupported.length > 0 && (
              <Alert severity="warning">
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  The system cannot check this yet:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {unsupported.map((u) => (
                    <li key={u.name}><Typography variant="caption"><strong>{u.name}</strong>: {u.reason}</Typography></li>
                  ))}
                </Box>
                <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
                  No fake rule is activated — ask the development team to add the missing check first.
                </Typography>
              </Alert>
            )}

            {unavailable.length > 0 && (
              <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                <Typography variant="caption">
                  Known gaps: {unavailable.map((c) => c.label.toLowerCase()).join("; ")} — rules needing
                  these are reported as unsupported, never silently faked.
                </Typography>
              </Alert>
            )}

            <Divider />
            <Box className="flex items-center justify-between gap-2">
              <Typography variant="body2" color="text.secondary">
                Prefer full control? Pick the action and the checks yourself.
              </Typography>
              <Button startIcon={<HandymanRoundedIcon />} onClick={onManual}>
                Build it yourself
              </Button>
            </Box>
          </>
        )}

        {draft && (
          <>
            <Alert severity="success" sx={{ py: 0.5 }}>
              Draft <strong>“{draft.name}”</strong> is ready — review it below. It is not live yet.
            </Alert>
            <PolicySections policy={draft} capabilities={capabilities} actions={actions} flows={flows} />
            {unsupported.length > 0 && (
              <Alert severity="warning">
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Parts of your instruction are not covered by the draft:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {unsupported.map((u) => (
                    <li key={u.name}><Typography variant="caption"><strong>{u.name}</strong>: {u.reason}</Typography></li>
                  ))}
                </Box>
              </Alert>
            )}
            {issues.length > 0 && (
              <Alert severity="error">
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {issues.map((issue, i) => (
                    <li key={i}><Typography variant="caption">{issue}</Typography></li>
                  ))}
                </Box>
              </Alert>
            )}
          </>
        )}
    </PolicyEditorFrame>
  );
}
