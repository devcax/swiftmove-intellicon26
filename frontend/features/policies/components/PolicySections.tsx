"use client";

// ---------------------------------------------------------------------------
// PolicySections — the nontechnical explanation of a policy every manager
// sees: when it applies, what must be true, what happens when it is missing,
// what the driver sees, and which conversation runs. Raw DSL never appears
// here; it lives behind the advanced view.
// ---------------------------------------------------------------------------

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { POD_ATTACHMENT_NOTE } from "@/features/policies/constants";
import {
  collectLeaves,
  evidenceDriverText,
  matchLines,
  onBlockSummary,
  requirementLines,
  settingLines,
  usesAttachmentOnlyCheck,
} from "@/features/policies/utils";
import type { ApiCapability, ApiPolicyAction, ApiPolicyOnBlock, ApiPolicyRuleNode } from "@/features/policies/types";
import type { ApiFlowSummary } from "@/features/flows/types";

export interface PolicyLike {
  action: string;
  enforcement?: string;
  match?: Record<string, unknown> | null;
  rule?: ApiPolicyRuleNode | null;
  onBlock?: ApiPolicyOnBlock | null;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" sx={{
      display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(160px, 210px) minmax(0, 1fr)" },
      gap: { xs: 1, md: 3 }, py: 2, borderBottom: "1px solid #e2e8f0", "&:last-child": { borderBottom: 0 },
    }}>
      <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "#334155", lineHeight: 1.8 }}>
        {title}
      </Typography>
      <Box sx={{ minWidth: 0, "& .MuiTypography-body2": { lineHeight: 1.8 } }}>{children}</Box>
    </Box>
  );
}

function BulletList({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <Box component="ul" role="list" sx={{ m: 0, p: 0, listStyle: "none" }}>
      {lines.map((line, i) => (
        <li key={i}>
          <Typography variant="body2" color="text.secondary">{line}</Typography>
        </li>
      ))}
    </Box>
  );
}

export default function PolicySections({
  policy,
  capabilities,
  actions,
  flows = [],
  compact = false,
}: {
  policy: PolicyLike;
  capabilities: ApiCapability[];
  actions: ApiPolicyAction[];
  flows?: ApiFlowSummary[];
  compact?: boolean;
}) {
  const capByName = React.useMemo(
    () => new Map(capabilities.map((c) => [c.name, c])),
    [capabilities]
  );
  const action = actions.find((a) => a.name === policy.action);
  const isSetting = policy.enforcement === "SETTING";
  const when = matchLines(policy.match);
  const requirements = requirementLines(policy.rule ?? null, capByName);
  const settings = isSetting ? settingLines(policy.rule?.setting) : [];
  const leaves = collectLeaves(policy.rule ?? null);
  const firstEvidence =
    leaves
      .map((leaf) => (leaf.requirement ? capByName.get(leaf.requirement)?.evidence : null))
      .find((e) => e != null) ?? null;
  const driverAsk = evidenceDriverText(firstEvidence);
  const flowKey = policy.onBlock?.flowKey ?? null;
  const linkedFlow = flowKey ? flows.find((f) => f.key === flowKey) : null;
  const anyUnsupported = requirements.some((r) => r.unsupported);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: compact ? 0 : 0.5 }}>
      <Section title="When does this rule apply?">
        <Typography variant="body2" color="text.secondary">
          {action ? (
            <>
              When <strong>{action.label.toLowerCase().replace(/^[a-z]/, (c) => c)}</strong>
              {action.actor === "ANY" ? "" : action.actor === "SYSTEM" ? " (automatic)" : ` — ${action.description}`}
            </>
          ) : (
            <>Action <strong>{policy.action}</strong></>
          )}
        </Typography>
        {when.length > 0 ? (
          <BulletList lines={when} />
        ) : (
          <Typography variant="body2" color="text.secondary">Every time — no extra conditions.</Typography>
        )}
      </Section>

      <Section title={isSetting ? "Current setting" : "What must be true?"}>
        {isSetting ? (
          <BulletList lines={settings} />
        ) : requirements.length > 0 ? (
          <Box component="ul" role="list" sx={{ m: 0, p: 0, listStyle: "none" }}>
            {requirements.map((line, i) => (
              <li key={i} style={{ marginLeft: line.depth > 1 ? (line.depth - 1) * 14 : 0 }}>
                <Typography variant="body2" color={line.unsupported ? "error" : "text.secondary"}>
                  {line.joiner === "any" && (i === 0 || requirements[i - 1].joiner !== "any") ? "One of: " : ""}
                  {line.joiner === "any" && i > 0 && requirements[i - 1].joiner === "any" ? "or " : ""}
                  {line.joiner === "not" ? "Must not: " : ""}
                  {line.text}
                </Typography>
              </li>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">No requirements.</Typography>
        )}
      </Section>

      {!isSetting && (
        <Section title="What happens if it is missing?">
          <Typography variant="body2" color="text.secondary">{onBlockSummary(policy.onBlock)}</Typography>
          {driverAsk && (
            <Typography variant="body2" color="text.secondary">{driverAsk}</Typography>
          )}
        </Section>
      )}

      {!isSetting && (
        <Section title="What will the driver see?">
          <Typography
            variant="body2"
            sx={{
              color: "#334155",
              overflowWrap: "anywhere",
            }}
          >
            {policy.onBlock?.message?.trim()
              ? `“${policy.onBlock.message}”`
              : "The bot explains the missing requirement in plain words (from the failing check)."}
          </Typography>
        </Section>
      )}

      {!isSetting && (
        <Section title="Which conversation is used?">
          <Box className="flex flex-wrap items-center gap-1">
            {flowKey ? (
              <Typography variant="body2" color="text.secondary">
                {linkedFlow ? `Custom: ${linkedFlow.name}` : `Custom flow "${flowKey}" (not found — falls back to standard)`}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">Standard helper (explains, collects evidence, retries)</Typography>
            )}
          </Box>
        </Section>
      )}

      {anyUnsupported && (
        <Alert severity="error" sx={{ py: 0 }}>
          This draft uses a capability the system does not support — it cannot be published.
        </Alert>
      )}
      {usesAttachmentOnlyCheck(policy.rule ?? null) && (
        <Alert severity="info" sx={{ py: 0 }}>{POD_ATTACHMENT_NOTE}</Alert>
      )}
    </Box>
  );
}
