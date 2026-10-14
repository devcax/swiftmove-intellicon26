"use client";

import * as React from "react";
import { fetchPolicies } from "@/features/policies/api";
import { fetchFlows } from "@/features/flows/api";
import type { ApiPolicy, ApiPolicyListPayload } from "@/features/policies/types";
import type { ApiFlowSummary } from "@/features/flows/types";
import { feedback } from "@/shared/feedback/store";

/** Loads the catalogs shared by both creation methods. */
export function usePolicyCreation() {
  const [data, setData] = React.useState<ApiPolicyListPayload | null>(null);
  const [flows, setFlows] = React.useState<ApiFlowSummary[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [saved, setSaved] = React.useState<{ policy: ApiPolicy; verb: string } | null>(null);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [catalog, flowList] = await Promise.all([fetchPolicies(), fetchFlows()]);
        if (!active) return;
        setData(catalog);
        setFlows(flowList.flows ?? []);
        setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load rule creation. Please try again.");
      }
    })();
    return () => { active = false; };
  }, [attempt]);

  return {
    data, flows, error, saved,
    retry: () => { setError(null); setAttempt((value) => value + 1); },
    onSaved: (policy: ApiPolicy, verb: string) => { setSaved({ policy, verb }); feedback.success(`“${policy.name}” ${verb}.`); },
    reset: () => setSaved(null),
  };
}
