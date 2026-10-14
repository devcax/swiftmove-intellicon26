"use client";

// ---------------------------------------------------------------------------
// PolicyDetailDialog — the full view of one rule: the plain-English sections,
// version history with explicit rollback, the lifecycle actions (publish,
// pause, revise, archive, delete draft), and the advanced raw-DSL view.
// ---------------------------------------------------------------------------

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PolicySections from "@/features/policies/components/PolicySections";
import GenerateConversationDialog from "@/features/policies/components/GenerateConversationDialog";
import { statusChip } from "@/features/policies/components/PolicyCard";
import type { PolicyGroup } from "@/features/policies/utils";
import type { ApiCapability, ApiPolicy, ApiPolicyAction } from "@/features/policies/types";
import type { ApiFlowSummary } from "@/features/flows/types";

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AdvancedJson({ policy }: { policy: ApiPolicy }) {
  const raw = {
    key: policy.key,
    action: policy.action,
    enforcement: policy.enforcement,
    match: policy.match,
    rule: policy.rule,
    onBlock: policy.onBlock,
    position: policy.position,
  };
  return (
    <Box
      component="pre"
      sx={{
        m: 0, p: 1.5, borderRadius: 2, bgcolor: "#0f172a", color: "#e2e8f0",
        fontSize: 11.5, fontFamily: "monospace", overflowX: "auto", maxHeight: 320,
      }}
    >
      {JSON.stringify(raw, null, 2)}
    </Box>
  );
}

export default function PolicyDetailDialog({
  group,
  capabilities,
  actions,
  flows,
  busy,
  onClose,
  onPublish,
  onToggle,
  onRevise,
  onArchive,
  onDelete,
  onTest,
  onChanged,
}: {
  group: PolicyGroup;
  capabilities: ApiCapability[];
  actions: ApiPolicyAction[];
  flows: ApiFlowSummary[];
  busy: boolean;
  onClose: () => void;
  onPublish: (policy: ApiPolicy) => void;
  onToggle: (policy: ApiPolicy, enabled: boolean) => void;
  onRevise: (policy: ApiPolicy) => void;
  onArchive: (policy: ApiPolicy) => void;
  onDelete: (policy: ApiPolicy) => void;
  onTest: (policy: ApiPolicy) => void;
  /** The rule or its conversation was saved or published elsewhere: reload. */
  onChanged: () => void;
}) {
  const [viewing, setViewing] = React.useState<ApiPolicy>(group.head);
  const [advanced, setAdvanced] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const published = group.versions.find((v) => v.status === "PUBLISHED") ?? null;
  const chip = statusChip(viewing.status, viewing.enabled);
  const isSetting = viewing.enforcement === "SETTING";
  const canDelete = viewing.status === "DRAFT" && !viewing.isSystem;
  const isRollbackTarget =
    viewing.status !== "PUBLISHED" && published != null && viewing.version < published.version;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>
        <Box className="flex flex-wrap items-center gap-1.5">
          {viewing.name}
          <Chip size="small" color={chip.color} variant={viewing.status === "PUBLISHED" ? "filled" : "outlined"} label={chip.label} />
          <Chip size="small" variant="outlined" label={`v${viewing.version}`} />
          {viewing.isSystem && <Chip size="small" variant="outlined" label="built-in" />}
          {isSetting && <Chip size="small" color="info" variant="outlined" label="setting" />}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
        {viewing.sourceInstruction && (
          <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
            <Typography variant="caption">
              Created from the instruction: “{viewing.sourceInstruction}”
            </Typography>
          </Alert>
        )}

        <PolicySections policy={viewing} capabilities={capabilities} actions={actions} flows={flows} />

        <Box className="flex flex-wrap items-center gap-1.5">
          <Button size="small" variant="outlined" onClick={() => onTest(viewing)}>
            Test with a sample situation
          </Button>
          {!isSetting && viewing.status !== "ARCHIVED" && (
            <Button size="small" variant="outlined" onClick={() => setGenerating(true)}>
              Generate conversation
            </Button>
          )}
          <Button size="small" variant="text" onClick={() => setAdvanced((a) => !a)}>
            {advanced ? "Hide technical view" : "Advanced (technical view)"}
          </Button>
        </Box>
        <Collapse in={advanced}>
          <AdvancedJson policy={viewing} />
        </Collapse>

        <Divider />

        <Box>
          <Box className="flex items-center gap-1">
            <HistoryRoundedIcon sx={{ fontSize: 18, color: "#64748b" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Change history</Typography>
          </Box>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            {group.versions.map((version) => {
              const vChip = statusChip(version.status, version.enabled);
              const rollback = published != null && version.version < published.version && version.status !== "PUBLISHED";
              return (
                <Box
                  key={version.id}
                  className="flex flex-wrap items-center gap-1.5"
                  sx={{
                    p: 1, borderRadius: 2, border: "1px solid",
                    borderColor: version.id === viewing.id ? "#1e3a8a" : "#e2e8f0",
                  }}
                >
                  <Chip size="small" variant="outlined" label={`v${version.version}`} />
                  <Chip size="small" color={vChip.color} variant="outlined" label={vChip.label} />
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {fmtWhen(version.updated_at)}
                  </Typography>
                  {version.id !== viewing.id && (
                    <Button size="small" onClick={() => setViewing(version)}>View</Button>
                  )}
                  {version.status !== "PUBLISHED" && (
                    <Button
                      size="small" variant={rollback ? "outlined" : "contained"} disabled={busy}
                      onClick={() => onPublish(version)}
                    >
                      {rollback ? "Roll back to this" : "Publish"}
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
          {isRollbackTarget && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Publishing this older version replaces the live v{published?.version} — a rollback.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        {canDelete && (
          <Button color="error" disabled={busy} onClick={() => onDelete(viewing)} sx={{ mr: "auto" }}>
            Delete draft
          </Button>
        )}
        {viewing.status !== "ARCHIVED" && !canDelete && <Box sx={{ mr: "auto" }} />}
        {viewing.status !== "ARCHIVED" && (
          <Button disabled={busy} onClick={() => onArchive(viewing)}>Archive</Button>
        )}
        {viewing.status === "PUBLISHED" && (
          <Button disabled={busy} onClick={() => onToggle(viewing, !viewing.enabled)}>
            {viewing.enabled ? "Pause rule" : "Resume rule"}
          </Button>
        )}
        <Button variant="outlined" disabled={busy} onClick={() => onRevise(viewing)}>
          Edit as new version
        </Button>
        {viewing.status !== "PUBLISHED" && (
          <Button variant="contained" disabled={busy} onClick={() => onPublish(viewing)}>
            {isRollbackTarget ? "Roll back & publish" : "Publish"}
          </Button>
        )}
      </DialogActions>
      {generating && (
        <GenerateConversationDialog policy={viewing} onClose={() => setGenerating(false)} onChanged={onChanged} />
      )}
    </Dialog>
  );
}
