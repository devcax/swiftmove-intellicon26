"use client";

// ---------------------------------------------------------------------------
// PolicySimulator — tests rules against a sample situation using the REAL
// backend policy engine (POST /api/policies/test). Unlike the flow simulator
// it does not mock action execution: it proves whether the published policy
// would actually allow or block the action, and previews the conversation
// the driver would get (linked custom flow or the standard helper).
// ---------------------------------------------------------------------------

import * as React from "react";
import { feedback } from "@/shared/feedback/store";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { EmptyState } from "@/shared/components/EmptyState";
import { PolicyApiError, testPolicy } from "@/features/policies/api";
import { evidenceDriverText, labelize } from "@/features/policies/utils";
import {
  INCIDENT_TYPE_OPTIONS,
  MILESTONE_OPTIONS,
  POLICY_ACTORS,
  POLICY_SOURCES,
  SIM_JOB_STATUSES,
  STAGE_OPTIONS,
} from "@/features/policies/constants";
import type { ApiPolicy, ApiPolicyAction, ApiPolicyTestInput, ApiPolicyTestResult, ApiPolicyTestSample } from "@/features/policies/types";

function TestSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Box component="fieldset" sx={{ m: 0, p: 0, minWidth: 0, border: 0, pb: 3, mb: 3, borderBottom: "1px solid #cbd5e1" }}>
    <Typography component="legend" sx={{ p: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</Typography>
    <Typography sx={{ fontSize: 12.5, color: "#475569", mt: 0.75, mb: 2.5, lineHeight: 1.7 }}>{description}</Typography>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>{children}</Box>
  </Box>;
}

export default function PolicySimulator({
  policies,
  actions,
  presetPolicyId = null,
}: {
  policies: ApiPolicy[];
  actions: ApiPolicyAction[];
  presetPolicyId?: string | null;
}) {
  const testable = policies.filter((p) => p.enforcement !== "SETTING" && p.status !== "ARCHIVED");
  const [target, setTarget] = React.useState<"action" | "policy">(presetPolicyId ? "policy" : "action");
  const [policyId, setPolicyId] = React.useState<string>(presetPolicyId ?? "");
  const [action, setAction] = React.useState("trip.milestone");
  const [actor, setActor] = React.useState<"DRIVER" | "MANAGER" | "SYSTEM">("DRIVER");
  const [source, setSource] = React.useState<"CHAT" | "DOCUMENT" | "MANAGER" | "API" | "TIMER">("CHAT");

  const [jobStatus, setJobStatus] = React.useState("ASSIGNED");
  const [pickupInHours, setPickupInHours] = React.useState(6);
  const [deliveryInHours, setDeliveryInHours] = React.useState(30);
  const [pickupVerified, setPickupVerified] = React.useState(false);
  const [deliveryVerified, setDeliveryVerified] = React.useState(false);
  const [driverStatus, setDriverStatus] = React.useState("ACTIVE");
  const [hasAssignment, setHasAssignment] = React.useState(false);
  const [released, setReleased] = React.useState(false);
  const [openAccident, setOpenAccident] = React.useState(false);

  const [milestone, setMilestone] = React.useState("DEPARTED");
  const [stage, setStage] = React.useState("DELIVERY");
  const [incidentType, setIncidentType] = React.useState("ACCIDENT");

  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<ApiPolicyTestResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const effectiveAction = target === "policy"
    ? testable.find((p) => p.id === policyId)?.action ?? action
    : action;

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const now = Date.now();
      const pickupAt = new Date(now + pickupInHours * 3600_000).toISOString();
      const deliveryAt = new Date(now + deliveryInHours * 3600_000).toISOString();
      const sample: ApiPolicyTestSample = {
        job: {
          job_number: "JOB-SAMPLE",
          current_status: jobStatus,
          pickup_at: pickupAt,
          delivery_at: deliveryAt,
          pickup_verified_at: pickupVerified ? new Date(now - 3600_000).toISOString() : null,
          delivery_verified_at: deliveryVerified ? new Date(now - 1800_000).toISOString() : null,
        },
        driver: { name: "Sample Driver", status: driverStatus },
        assignment: hasAssignment ? { job_number: "JOB-OTHER", started_at: null } : null,
        releasedFromJob: released,
        openIncidents: openAccident
          ? [{ id: "sample-incident", incident_type: "ACCIDENT", severity: "CRITICAL", safety_followup_at: null }]
          : [],
        params: {
          milestone,
          stage,
          incidentType,
          pickupAt,
          deliveryAt,
        },
      };
      const payload: ApiPolicyTestInput =
        target === "policy"
          ? { policyId, actor, source, sample }
          : { action, actor, source, sample };
      const outcome = await testPolicy(payload);
      setResult(outcome);
      if (outcome.allowed) feedback.success("Policy test passed. The sample action is allowed.");
      else feedback.info("Policy test completed. The sample action is blocked by its requirements.");
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : "The simulation failed.");
      setResult(null);
      setError(
        err instanceof PolicyApiError && err.issues.length > 0
          ? err.issues.join(" · ")
          : err instanceof Error
            ? err.message
            : "The simulation failed."
      );
    } finally {
      setRunning(false);
    }
  };

  const conversationText = result?.conversation
    ? evidenceDriverText(result.conversation.evidence ?? null)
    : null;

  return (
    <Box component="section">
      <Typography component="h2" sx={{ fontSize: 20, fontWeight: 700 }}>Test a rule against a sample situation</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 3 }}>
        Set up an example to check whether an action is allowed. Real jobs stay unchanged and no messages are sent.
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: { xs: 3, lg: 4 }, alignItems: "start" }}>
        <Box component="section" aria-labelledby="policy-test-setup" sx={{ minWidth: 0, bgcolor: "#fff", border: "1px solid #cbd5e1", borderRadius: 1.5, overflow: "hidden" }}>
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: "#f1f5fc", borderBottom: "1px solid #cbd5e1" }}>
            <Typography id="policy-test-setup" component="h3" sx={{ fontSize: 18, fontWeight: 700 }}>Test setup</Typography>
            <Typography sx={{ fontSize: 12.5, color: "#475569", mt: 0.5 }}>Choose your rules and describe the situation below.</Typography>
          </Box>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <TestSection title="Choose what to test" description="Check one rule on its own, or all live rules for an action.">
          <TextField select size="small" label="Rules to check" value={target} onChange={(e) => setTarget(e.target.value as "action" | "policy")}>
            <MenuItem value="action">All live rules for one action</MenuItem>
            <MenuItem value="policy">One specific rule</MenuItem>
          </TextField>
          {target === "policy" ? (
            <TextField select size="small" label="Rule" value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
              {testable.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name} (v{p.version}{p.status === "PUBLISHED" ? ", live" : ", draft"})</MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField select size="small" label="Action to check" value={action} onChange={(e) => setAction(e.target.value)}>
              {actions.filter((a) => a.name !== "conversation.receive").map((a) => (
                <MenuItem key={a.name} value={a.name}>{a.label}</MenuItem>
              ))}
            </TextField>
          )}
          </TestSection>
          <TestSection title="Describe the action" description="Choose who takes the action and where it comes from.">
          {target === "policy" && policyId && <Typography variant="body2" color="text.secondary">Action: <strong>{actions.find((item) => item.name === effectiveAction)?.label ?? effectiveAction}</strong></Typography>}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField select size="small" label="Who takes the action?" value={actor} onChange={(e) => setActor(e.target.value as typeof actor)} sx={{ flex: 1 }}>
              {POLICY_ACTORS.map((a) => <MenuItem key={a} value={a}>{labelize(a)}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Where does it come from?" value={source} onChange={(e) => setSource(e.target.value as typeof source)} sx={{ flex: 1 }}>
              {POLICY_SOURCES.map((s) => <MenuItem key={s} value={s}>{labelize(s)}</MenuItem>)}
            </TextField>
          </Box>
          {effectiveAction === "trip.milestone" && (
            <TextField select size="small" label="The reported milestone" value={milestone} onChange={(e) => setMilestone(e.target.value)}>
              {MILESTONE_OPTIONS.map((m) => <MenuItem key={m} value={m}>{labelize(m)}</MenuItem>)}
            </TextField>
          )}
          {effectiveAction === "trip.verifyDocument" && (
            <TextField select size="small" label="The document being verified" value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGE_OPTIONS.map((s) => <MenuItem key={s} value={s}>{labelize(s)}</MenuItem>)}
            </TextField>
          )}
          {effectiveAction === "incident.report" && (
            <TextField select size="small" label="The incident type" value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
              {INCIDENT_TYPE_OPTIONS.map((t) => <MenuItem key={t} value={t}>{labelize(t)}</MenuItem>)}
            </TextField>
          )}

          </TestSection>
          <TestSection title="Set the sample situation" description="Describe the job and driver before the action happens. These are sample values, not a real job or driver.">
          <Typography component="h4" sx={{ fontSize: 14, fontWeight: 700 }}>Sample job</Typography>
          <TextField select size="small" label="Current job status" value={jobStatus} onChange={(e) => setJobStatus(e.target.value)}>
            {SIM_JOB_STATUSES.map((s) => <MenuItem key={s} value={s}>{labelize(s)}</MenuItem>)}
          </TextField>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField
              type="number" size="small" label="Pickup in (hours)" helperText="Hours from now; negative means in the past." value={pickupInHours}
              onChange={(e) => setPickupInHours(Number(e.target.value))} sx={{ flex: 1 }}
              slotProps={{ htmlInput: { min: -72, max: 720 } }}
            />
            <TextField
              type="number" size="small" label="Delivery in (hours)" helperText="Hours from now, not hours after pickup." value={deliveryInHours}
              onChange={(e) => setDeliveryInHours(Number(e.target.value))} sx={{ flex: 1 }}
              slotProps={{ htmlInput: { min: -72, max: 1440 } }}
            />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", "& .MuiFormControlLabel-root": { ml: -1 } }}>
            <FormControlLabel control={<Checkbox size="small" checked={pickupVerified} onChange={(e) => setPickupVerified(e.target.checked)} />} label={<Typography variant="body2">Pickup document verified</Typography>} />
            <FormControlLabel control={<Checkbox size="small" checked={deliveryVerified} onChange={(e) => setDeliveryVerified(e.target.checked)} />} label={<Typography variant="body2">Delivery document verified</Typography>} />
          </Box>

          <Divider />
          <Typography component="h4" sx={{ fontSize: 14, fontWeight: 700 }}>Sample driver</Typography>
          <TextField select size="small" label="Driver account status" value={driverStatus} onChange={(e) => setDriverStatus(e.target.value)}>
            {["ACTIVE", "INACTIVE", "SUSPENDED"].map((s) => <MenuItem key={s} value={s}>{labelize(s)}</MenuItem>)}
          </TextField>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", "& .MuiFormControlLabel-root": { ml: -1 } }}>
            <FormControlLabel control={<Checkbox size="small" checked={hasAssignment} onChange={(e) => setHasAssignment(e.target.checked)} />} label={<Typography variant="body2">Already has a live job</Typography>} />
            <FormControlLabel control={<Checkbox size="small" checked={released} onChange={(e) => setReleased(e.target.checked)} />} label={<Typography variant="body2">Was released from this job</Typography>} />
            <FormControlLabel control={<Checkbox size="small" checked={openAccident} onChange={(e) => setOpenAccident(e.target.checked)} />} label={<Typography variant="body2">Open accident, safety check pending</Typography>} />
          </Box>
          </TestSection>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Button
              variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={run}
              disabled={running || (target === "policy" && !policyId)}
            >
              {running ? "Running…" : "Run the test"}
            </Button>
            <Typography sx={{ fontSize: 12, color: "#475569" }}>The result appears in the Outcome panel.</Typography>
          </Box>
          </Box>
        </Box>

        <Box component="section" aria-labelledby="policy-test-outcome" aria-busy={running} sx={{ minWidth: 0, bgcolor: "#fff", border: "1px solid #cbd5e1", borderRadius: 1.5, overflow: "hidden" }}>
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: "#f1f5fc", borderBottom: "1px solid #cbd5e1" }}>
            <Typography id="policy-test-outcome" component="h3" sx={{ fontSize: 18, fontWeight: 700 }}>Outcome</Typography>
            <Typography sx={{ fontSize: 12.5, color: "#475569", mt: 0.5 }}>See the decision, block reasons, and driver response.</Typography>
          </Box>
          <Box aria-live="polite" sx={{ display: "flex", flexDirection: "column", gap: 2, p: { xs: 2, sm: 3 } }}>
          {error && <Alert severity="error">{error}</Alert>}
          {!result && !error && (
            <EmptyState icon={<PlayArrowRoundedIcon />} title={running ? "Checking the sample situation…" : "Ready when you are"} description="Complete the test setup, then select Run the test to see the outcome here." />
          )}
          {result && (
            <>
              {result.allowed ? (
                <Alert severity="success">
                  <strong>Allowed.</strong> The tested rules allow this action in the sample situation.
                  {result.warnings.length > 0 ? ` (${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"} recorded.)` : ""}
                </Alert>
              ) : (
                <Alert severity="error">
                  <strong>Blocked.</strong> {result.nextStep?.message ?? result.failures[0]?.message}
                </Alert>
              )}

              {result.failures.map((f, i) => (
                <Box key={i} sx={{ p: 1.5, borderRadius: 2, border: "1px solid #fecaca", bgcolor: "#fef2f2" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {f.policyName ?? f.policyKey ?? "Rule"} · {f.blockMode === "ESCALATE" ? "stop + alert" : "stop"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{f.reason ?? f.message}</Typography>
                  {evidenceDriverText(f.evidence) && (
                    <Typography variant="caption" color="text.secondary">{evidenceDriverText(f.evidence)}</Typography>
                  )}
                </Box>
              ))}
              {result.warnings.map((f, i) => (
                <Box key={i} sx={{ p: 1.5, borderRadius: 2, border: "1px solid #fde68a", bgcolor: "#fffbeb" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{f.policyName ?? "Rule"} · warning</Typography>
                  <Typography variant="body2" color="text.secondary">{f.reason ?? f.message}</Typography>
                </Box>
              ))}

              {!result.allowed && (
                <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid #bfdbfe", bgcolor: "#eff6ff" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>What the driver would get</Typography>
                  {result.conversation.kind === "flow" ? (
                    <Typography variant="body2" color="text.secondary">
                      The custom conversation “{result.conversation.flowKey}” runs.
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                        “{result.conversation.message}”
                      </Typography>
                      {conversationText && (
                        <Typography variant="body2" color="text.secondary">{conversationText}</Typography>
                      )}
                      {result.conversation.waitsForManager && (
                        <Chip size="small" color="warning" variant="outlined" sx={{ mt: 0.5 }} label="Waits for a manager — the driver cannot satisfy this" />
                      )}
                    </>
                  )}
                </Box>
              )}
              <Typography variant="caption" color="text.secondary">{result.note}</Typography>
            </>
          )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
