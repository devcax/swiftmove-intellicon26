"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import HandymanRoundedIcon from "@mui/icons-material/HandymanRounded";
import CreatePolicyDialog from "./CreatePolicyDialog";
import PolicyBuilderDialog from "./PolicyBuilderDialog";
import { usePolicyCreation } from "../hooks/usePolicyCreation";
import { workspaceTabsSx } from "@/shared/styles/workspaceTabs";

/** Dedicated creation surface; both methods use the existing validated editors. */
export function PolicyCreationPage() {
  const router = useRouter();
  const [method, setMethod] = React.useState<"ai" | "manual">("ai");
  const { data, flows, error, retry, saved, onSaved, reset } = usePolicyCreation();
  const cancel = () => router.push("/policies");

  return (
    <Box sx={{ width: "100%", maxWidth: 1500, mx: "auto", px: { xs: 1.5, sm: 2.5 }, py: 2.5 }}>
      <Button component={Link} href="/policies" variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 2 }}>
        Back to operational rules
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Describe your rule with AI or choose the action and requirements yourself. Rules stay as drafts until you publish them.
      </Typography>

      {saved ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="success">“{saved.policy.name}” {saved.verb}.</Alert>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Button component={Link} href="/policies" variant="outlined">View operational rules</Button>
            <Button onClick={reset} variant="outlined">Create another rule</Button>
          </Box>
        </Box>
      ) : (
        <>
          <Tabs value={method} onChange={(_event, value) => setMethod(value)} variant="scrollable" scrollButtons="auto" aria-label="Rule creation method" sx={workspaceTabsSx}>
            <Tab id="policy-ai-tab" aria-controls="policy-ai-panel" value="ai" icon={<AutoAwesomeRoundedIcon />} iconPosition="start" label="Create with AI" />
            <Tab id="policy-manual-tab" aria-controls="policy-manual-panel" value="manual" icon={<HandymanRoundedIcon />} iconPosition="start" label="Create manually" />
          </Tabs>
          {error && <Alert severity="error" action={<Button color="inherit" onClick={retry}>Retry</Button>}>{error}</Alert>}
          {!data && !error && <Skeleton variant="rounded" height={280} aria-label="Loading rule creation" />}
          {data && (
            <>
              {data.store.source === "fallback" && <Alert severity="warning" sx={{ mb: 2 }}>The policy tables are unavailable. Apply the database migrations before saving rules.</Alert>}
              <div role="tabpanel" id="policy-ai-panel" aria-labelledby="policy-ai-tab" hidden={method !== "ai"}>
                <CreatePolicyDialog embedded capabilities={data.capabilities} actions={data.actions} flows={flows} onClose={cancel} onSaved={onSaved} onManual={() => setMethod("manual")} />
              </div>
              <div role="tabpanel" id="policy-manual-panel" aria-labelledby="policy-manual-tab" hidden={method !== "manual"}>
                <PolicyBuilderDialog embedded mode="create" capabilities={data.capabilities} actions={data.actions} flows={flows} onClose={cancel} onSaved={onSaved} />
              </div>
            </>
          )}
        </>
      )}
    </Box>
  );
}
