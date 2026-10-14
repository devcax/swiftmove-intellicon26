"use client";

// ---------------------------------------------------------------------------
// GenerateConversationDialog — the rule and the conversation that satisfies it,
// authored together. The AI writes the conversation from the rule; both are
// saved as drafts; the manager reviews it in the graph and the simulator and
// publishes both with one button (the conversation first, then the rule).
// ---------------------------------------------------------------------------

import * as React from "react";
import { feedback } from "@/shared/feedback/store";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import FlowGraph from "@/features/flows/components/FlowGraph";
import FlowSimulator from "@/features/flows/components/FlowSimulator";
import { generatePolicyFlow, publishPolicy } from "@/features/policies/api";
import { fetchFlow, publishFlow } from "@/features/flows/api";
import type { ApiGeneratedConversation, ApiPolicy } from "@/features/policies/types";
import type { ApiFlowDetail } from "@/features/flows/types";

type Phase = "start" | "generating" | "review" | "publishing" | "done";

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export default function GenerateConversationDialog({
  policy,
  onClose,
  onChanged,
}: {
  policy: ApiPolicy;
  onClose: () => void;
  /** Something was saved or published: reload the list. */
  onChanged: () => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("start");
  const [generated, setGenerated] = React.useState<ApiGeneratedConversation | null>(null);
  const [flow, setFlow] = React.useState<ApiFlowDetail | null>(null);
  const [tab, setTab] = React.useState(0);
  const [selectedStep, setSelectedStep] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // What is live after a publish attempt, so a half-finished publish is never a mystery.
  const [live, setLive] = React.useState<{ flow: boolean; policy: boolean }>({ flow: false, policy: false });

  const draft = flow?.versions.find((v) => v.status === "DRAFT") ?? null;

  const generate = async () => {
    setPhase("generating");
    setError(null);
    try {
      const result = await generatePolicyFlow(policy.id);
      setGenerated(result);
      setFlow(await fetchFlow(result.flow.key));
      onChanged();
      setPhase("review");
      feedback.success("Conversation generated as a draft.");
    } catch (err) {
      const message = messageOf(err, "The conversation could not be written. Try again.");
      setError(message); feedback.error(message);
      setPhase("start");
    }
  };

  /** The conversation first, then the rule; the rule needs its conversation to be live. */
  const publishBoth = async () => {
    if (!generated || !draft) return;
    setPhase("publishing");
    setError(null);
    let flowLive = live.flow;
    try {
      if (!flowLive) {
        await publishFlow(generated.flow.key, draft.version);
        flowLive = true;
        setLive((current) => ({ ...current, flow: true }));
      }
      await publishPolicy(generated.policy.id);
      setLive({ flow: true, policy: true });
      onChanged();
      setPhase("done");
      feedback.success("The conversation and policy are now live.");
    } catch (err) {
      onChanged();
      feedback.error(flowLive ? `Conversation published, but the policy failed: ${messageOf(err, "Please try again.")}` : messageOf(err, "Nothing was published."));
      setError(
        flowLive
          ? `The conversation is live, but the rule was not published: ${messageOf(err, "the change failed")}. The rule is still not enforced with it.`
          : `Nothing was published: ${messageOf(err, "the conversation could not be published")}.`,
      );
      setPhase("review");
    }
  };

  const busy = phase === "generating" || phase === "publishing";

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 800 }}>Conversation for “{policy.name}”</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error" role="alert">{error}</Alert>}

        {phase === "start" && (
          <Typography variant="body2" color="text.secondary">
            The assistant will write the WhatsApp conversation that explains this rule to a driver and collects what it asks for, then link it
            to a draft of the rule. Nothing goes live: you review the conversation, try it in the simulator, and publish both together.
          </Typography>
        )}

        {phase === "generating" && (
          <Box className="flex items-center gap-2" aria-live="polite">
            <CircularProgress size={18} /> <Typography variant="body2">Writing the conversation…</Typography>
          </Box>
        )}

        {(phase === "review" || phase === "publishing" || phase === "done") && generated && flow && (
          <>
            {phase === "done" ? (
              <Alert severity="success">The conversation and the rule are both live.</Alert>
            ) : (
              <Alert severity="info" icon={false}>
                <Typography variant="body2">
                  Saved as drafts. {generated.collects.length > 0 ? `It collects: ${generated.collects.join(", ")}. ` : ""}
                  {generated.waitsFor.length > 0 ? `A manager has to give: ${generated.waitsFor.join(" ")}` : ""}
                </Typography>
              </Alert>
            )}
            {(live.flow || live.policy) && phase !== "done" && (
              <Alert severity="warning">
                Live now: {live.flow ? "the conversation" : "nothing"}{live.policy ? " and the rule" : ""}.
              </Alert>
            )}
            <Tabs value={tab} onChange={(_e, next) => setTab(next)}>
              <Tab label="Steps" sx={{ textTransform: "none", fontWeight: 700 }} />
              <Tab label="Try it" sx={{ textTransform: "none", fontWeight: 700 }} />
            </Tabs>
            <Box sx={{ height: 420, display: tab === 0 ? "block" : "none" }}>
              <FlowGraph definition={(draft ?? flow.versions[0]).definition} selectedId={selectedStep} onSelect={setSelectedStep} />
            </Box>
            <Box sx={{ minHeight: 420, display: tab === 1 ? "block" : "none" }}>
              <FlowSimulator flowKey={flow.key} versions={flow.versions} onError={setError} />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>{phase === "done" ? "Close" : "Close (keep the drafts)"}</Button>
        {phase === "start" && (
          <Button variant="contained" onClick={() => void generate()}>Write the conversation</Button>
        )}
        {(phase === "review" || phase === "publishing") && (
          <>
            <Button variant="outlined" disabled={busy} onClick={() => void generate()}>Write it again</Button>
            <Button variant="contained" color="warning" disabled={busy || !draft} onClick={() => void publishBoth()}>
              {phase === "publishing" ? "Publishing…" : live.flow ? "Publish the rule" : "Publish both"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
