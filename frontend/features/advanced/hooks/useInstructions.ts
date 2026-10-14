"use client";

import * as React from "react";
import { fetchInstructions } from "@/features/advanced/api";
import type { ApiInstruction } from "@/features/advanced/types";
import { feedback } from "@/shared/feedback/store";


/** The AI instructions, a way to reload them, and the message shown after a save or a reset. */
export function useInstructions() {
  const [instructions, setInstructions] = React.useState<ApiInstruction[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const payload = await fetchInstructions();
      setInstructions(payload.instructions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the AI instructions.");
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  return {
    instructions, error, load,
    notify: feedback.success,
    notifyError: feedback.error,
  };
}
