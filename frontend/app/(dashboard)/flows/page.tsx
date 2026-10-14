"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { feedback } from "@/shared/feedback/store";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import { fetchFlows, setFlowEnabled } from "@/features/flows/api";
import { FlowEditorView } from "@/features/flows/components/FlowEditorView";
import { FlowListView } from "@/features/flows/components/FlowListView";
import { NewFlowDialog } from "@/features/flows/components/NewFlowDialog";
import type { ApiFlowListPayload, ApiFlowSummary } from "@/features/flows/types";

export default function FlowsPage() {
  const [payload, setPayload] = React.useState<ApiFlowListPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setPayload(await fetchFlows());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the flows.");
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await fetchFlows();
        if (cancelled) return;
        setPayload(loaded);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the flows.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const notify = feedback.success;
  const notifyError = feedback.error;

  const toggle = async (flow: ApiFlowSummary, enabled: boolean) => {
    setBusyKey(flow.key);
    try {
      await setFlowEnabled(flow.key, enabled);
      notify(
        enabled
          ? `"${flow.name}" is live — the bot uses it within a minute.`
          : `"${flow.name}" is off — the bot falls back to its built-in behavior.`
      );
      await load();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not update the flow.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1500, mx: "auto", px: { xs: 1.5, sm: 2.5 }, py: 2.5 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!payload && !error && <SectionPreloader label="Loading conversation flows…" />}

      {payload && (
        <FlowListView
          flows={payload.flows}
          busyKey={busyKey}
          onOpen={setSelectedKey}
          onToggle={toggle}
          onNew={() => setNewOpen(true)}
          selectedKey={selectedKey}
          renderEditor={(flow) => <FlowEditorView key={flow.key} flowKey={flow.key} meta={payload.meta} onBack={() => setSelectedKey(null)} onChanged={load} notify={notify} notifyError={notifyError} embedded />}
        />
      )}

      {newOpen && payload && (
        <NewFlowDialog
          meta={payload.meta}
          onClose={() => setNewOpen(false)}
          onCreated={(key) => {
            setNewOpen(false);
            notify("Flow created — build its steps, then publish.");
            void load();
            setSelectedKey(key);
          }}
          onError={notifyError}
        />
      )}

    </Box>
  );
}
