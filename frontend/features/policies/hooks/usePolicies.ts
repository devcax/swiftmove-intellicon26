"use client";

import * as React from "react";
import { fetchFlows } from "@/features/flows/api";
import type { ApiFlowSummary } from "@/features/flows/types";
import { archivePolicy, deletePolicy, disablePolicy, enablePolicy, fetchPolicies, publishPolicy } from "@/features/policies/api";
import type { ApiPolicy, ApiPolicyListPayload } from "@/features/policies/types";
import { groupPolicyVersions } from "@/features/policies/utils";
import type { PolicyGroup } from "@/features/policies/utils";
import type { Confirmation } from "@/shared/components/ConfirmDialog";
import { feedback } from "@/shared/feedback/store";


/** The policies page: what is loaded, what is open, and every change a manager can make to a rule. */
export function usePolicies() {
  const [data, setData] = React.useState<ApiPolicyListPayload | null>(null);
  const [flows, setFlows] = React.useState<ApiFlowSummary[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState(0);
  const [simPreset, setSimPreset] = React.useState<string | null>(null);
  const [openedKey, setOpenedKey] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<Confirmation | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [policies, flowList] = await Promise.all([fetchPolicies(), fetchFlows()]);
      setData(policies);
      setFlows(flowList.flows ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the policies.");
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const notify = feedback.success;
  const notifyError = feedback.error;

  const groups = React.useMemo(() => groupPolicyVersions(data?.policies ?? []), [data]);
  const actionOrder = React.useMemo(() => new Map((data?.actions ?? []).map((a, i) => [a.name, i])), [data]);
  const ruleGroups = groups
    .filter((g) => g.head.enforcement !== "SETTING")
    .sort((a, b) => (actionOrder.get(a.head.action) ?? 99) - (actionOrder.get(b.head.action) ?? 99));
  const settingGroups = groups.filter((g) => g.head.enforcement === "SETTING");
  const unavailable = (data?.capabilities ?? []).filter((c) => c.available === false);
  const opened = openedKey ? groups.find((g) => g.key === openedKey) ?? null : null;

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      notify(message);
      await load();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "The change failed.");
    } finally {
      setBusy(false);
    }
  };

  const askToggle = (policy: ApiPolicy, enabled: boolean) => {
    const apply = () => run(
      () => (enabled ? enablePolicy(policy.id) : disablePolicy(policy.id)),
      enabled ? `"${policy.name}" is on again.` : `"${policy.name}" is paused.`
    );
    if (!enabled && policy.status === "PUBLISHED") {
      setConfirm({
        title: "Pause a live rule?",
        body: `"${policy.name}" stops being enforced immediately — the bot, the dashboard and the timers will no longer check it. Are you sure?`,
        action: apply,
      });
      return;
    }
    void apply();
  };

  const askPublish = (policy: ApiPolicy, group?: PolicyGroup) => {
    const live = group?.versions.find((v) => v.status === "PUBLISHED");
    const rollback = live != null && policy.version < live.version;
    setConfirm({
      title: rollback ? "Roll back this rule?" : "Publish this rule?",
      body: rollback
        ? `v${policy.version} of "${policy.name}" goes live and replaces the current live v${live?.version}. This is a rollback.`
        : `v${policy.version} of "${policy.name}" goes live immediately for every entry point (bot, dashboard, timers).`,
      action: () => run(() => publishPolicy(policy.id), `"${policy.name}" v${policy.version} is now live.`),
    });
  };

  const askArchive = (policy: ApiPolicy) => {
    setConfirm({
      title: "Archive this version?",
      body: `"${policy.name}" v${policy.version} is archived. It stays in the history but is never enforced.`,
      action: () => run(() => archivePolicy(policy.id), `"${policy.name}" v${policy.version} archived.`),
    });
  };

  const askDelete = (policy: ApiPolicy) => {
    setConfirm({
      title: "Delete this draft?",
      body: `The draft "${policy.name}" v${policy.version} is removed permanently. Published history is never deleted.`,
      action: () => run(() => deletePolicy(policy.id), "Draft deleted."),
    });
  };

  return {
    data, flows, error, tab, setTab, simPreset, setSimPreset, openedKey, setOpenedKey,
    confirm, setConfirm, busy, load, notify, groups, ruleGroups, settingGroups, unavailable, opened,
    askToggle, askPublish, askArchive, askDelete,
  };
}

export type PoliciesState = ReturnType<typeof usePolicies>;
