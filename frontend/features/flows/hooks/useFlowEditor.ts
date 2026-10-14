"use client";

import { FlowApiError, deleteFlow, fetchFlow, publishFlow, rollbackFlow, saveFlow } from "@/features/flows/api";
import type { ApiFlowDefinition, ApiFlowDetail, ApiFlowMeta, ApiFlowStep, ApiFlowStepType, ApiFlowValidationIssue, ApiFlowVersion } from "@/features/flows/types";
import { freshStepId, makeStep, renameReferences, savePayloadFor, slugify, snapOf, stepTargets, topicIsValid, validateDefinition, workingFrom } from "@/features/flows/model";
import type { Working } from "@/features/flows/model";
import * as React from "react";
import { commitHistory, createHistory, redoHistory, undoHistory } from "../history";
import { deleteFlowStep, pruneUnusedEnds } from "../graphModel";

type Positions = Record<string, { x: number; y: number }>;
/** Card positions are a layout preference kept in this browser; undo and redo cover them with the steps. */
interface Workspace { working: Working | null; positions: Positions }
const layoutKey = (flowKey: string) => `swiftmove.flow-layout.v3.${flowKey}`;
function readPositions(flowKey: string): Positions {
  try {
    const stored = typeof window !== "undefined" ? JSON.parse(localStorage.getItem(layoutKey(flowKey)) ?? "{}") : {};
    return Object.fromEntries(Object.entries(stored).filter(([, value]) => value && typeof value === "object" && Number.isFinite((value as { x: number }).x) && Number.isFinite((value as { y: number }).y))) as Positions;
  } catch { return {}; }
}

interface FlowEditorArgs {
  flowKey: string;
  meta: ApiFlowMeta;
  onBack: () => void;
  onChanged: () => void;
  notify: (message: string) => void;
  notifyError: (message: string) => void;
}

/** Everything the flow editor does: loads the flow, keeps the working copy, checks it, and saves, publishes, rolls back or deletes it. */
export function useFlowEditor({ flowKey, meta, onBack, onChanged, notify, notifyError }: FlowEditorArgs) {
  const [detail, setDetail] = React.useState<ApiFlowDetail | null>(null);
  const [history, setHistory] = React.useState(() => createHistory<Workspace>({ working: null, positions: readPositions(flowKey) }));
  const { working, positions } = history.present;
  const setPositions = (value: Positions) => setHistory((previous) => commitHistory(previous, { ...previous.present, positions: value }));
  /** Record where new cards landed without adding an undo step of its own. */
  const pinPositions = (value: Positions) => setHistory((previous) => ({ ...previous, present: { ...previous.present, positions: value } }));
  React.useEffect(() => {
    try { localStorage.setItem(layoutKey(flowKey), JSON.stringify(positions)); } catch { /* Editing works without local storage; positions just aren't remembered. */ }
  }, [flowKey, positions]);
  const setWorking = (value: React.SetStateAction<Working | null>) => setHistory((previous) => commitHistory(previous, { ...previous.present, working: typeof value === "function" ? value(previous.present.working) : value }, "settings"));
  const undo = () => { setHistory(undoHistory); setServerIssues([]); };
  const redo = () => { setHistory(redoHistory); setServerIssues([]); };
  const [snapshot, setSnapshot] = React.useState("");
  const [selectedStepId, setSelectedStepId] = React.useState<string | null>(null);
  const [serverIssues, setServerIssues] = React.useState<ApiFlowValidationIssue[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [addAnchor, setAddAnchor] = React.useState<HTMLElement | null>(null);
  const [versionsAnchor, setVersionsAnchor] = React.useState<HTMLElement | null>(null);
  const [confirm, setConfirm] = React.useState<{ title: string; body: string; action: () => Promise<void> } | null>(null);
  const [aiDraftOpen, setAiDraftOpen] = React.useState(false);
  const [rightTab, setRightTab] = React.useState(0);

  const adopt = React.useCallback((d: ApiFlowDetail, w: Working) => {
    setDetail(d);
    setHistory((previous) => createHistory({ working: w, positions: previous.present.positions }));
    setSnapshot(snapOf(w));
    setServerIssues([]);
  }, [setDetail, setHistory, setSnapshot, setServerIssues]);

  const load = React.useCallback(async () => {
    try {
      const d = await fetchFlow(flowKey);
      adopt(d, workingFrom(d));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the flow.");
    }
  }, [flowKey, adopt]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const d = await fetchFlow(flowKey);
        if (cancelled) return;
        adopt(d, workingFrom(d));
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the flow.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [flowKey, adopt]);

  const dirty = working != null && snapOf(working) !== snapshot;

  const known = React.useMemo(
    () => ({ actions: meta.actions.map((a) => a.name), promptProviders: meta.promptProviders.map((p) => p.name), conditions: meta.conditions.map((c) => c.name) }),
    [meta]
  );
  const clientIssues = React.useMemo(
    () => (working ? validateDefinition(working.definition, known) : []),
    [working, known]
  );
  const issues = clientIssues.length > 0 ? clientIssues : serverIssues;
  const issueCountByStep = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of issues) {
      if (issue.step) map.set(issue.step, (map.get(issue.step) ?? 0) + 1);
    }
    return map;
  }, [issues]);

  const patchDefinition = (definition: ApiFlowDefinition, group?: string, layout?: Positions) => {
    setHistory((previous) => previous.present.working ? commitHistory(previous, { working: { ...previous.present.working, definition }, positions: layout ?? previous.present.positions }, group) : previous);
    setServerIssues([]);
  };

  const updateStep = (index: number, next: ApiFlowStep) => {
    if (!working) return;
    const prev = working.definition.steps[index];
    let definition: ApiFlowDefinition = {
      steps: working.definition.steps.map((s, i) => (i === index ? next : s)),
    };
    if (next.id !== prev.id) {
      definition = renameReferences(definition, prev.id, next.id);
      if (selectedStepId === prev.id) setSelectedStepId(next.id);
    }
    const sameRoutes = next.id === prev.id && JSON.stringify(stepTargets(next).map((route) => route.target)) === JSON.stringify(stepTargets(prev).map((route) => route.target)) && next.options?.length === prev.options?.length;
    patchDefinition(sameRoutes ? definition : pruneUnusedEnds(definition), sameRoutes ? `step:${next.id}` : undefined);
  };

  const moveStep = (index: number, delta: -1 | 1) => {
    if (!working) return;
    const steps = [...working.definition.steps];
    const [moved] = steps.splice(index, 1);
    steps.splice(index + delta, 0, moved);
    patchDefinition({ steps });
  };

  const removeStep = (index: number) => {
    if (!working) return;
    const removed = working.definition.steps[index];
    if (selectedStepId === removed.id) setSelectedStepId(null);
    patchDefinition(deleteFlowStep(working.definition, removed.id));
  };

  const addStep = (type: ApiFlowStepType) => {
    if (!working) return;
    setAddAnchor(null);
    const existing = new Set(working.definition.steps.map((s) => s.id));
    const step = makeStep(type, freshStepId(type, existing));
    const steps = [...working.definition.steps];
    const selectedIndex = selectedStepId ? steps.findIndex((s) => s.id === selectedStepId) : -1;
    const at = selectedIndex > 0 ? selectedIndex + 1 : steps.length;
    steps.splice(at, 0, step);
    patchDefinition({ steps });
    setSelectedStepId(step.id);
  };

  const captureIssues = (err: unknown, fallback: string) => {
    if (err instanceof FlowApiError) {
      if (err.issues.length > 0) {
        setServerIssues(err.issues);
        notifyError("The server rejected the definition — see the issues below.");
      } else {
        notifyError(err.message);
      }
      return;
    }
    notifyError(err instanceof Error ? err.message : fallback);
  };

  const save = async () => {
    if (!working) return;
    setBusy("save");
    try {
      await saveFlow(flowKey, savePayloadFor(working, detail?.isSystem ?? true));
      notify(`"${working.name}" saved as a draft.`);
      await load();
      onChanged();
    } catch (err) {
      captureIssues(err, "Could not save the flow.");
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (!working) return;
    setBusy("publish");
    try {
      if (dirty) {
        await saveFlow(flowKey, savePayloadFor(working, detail?.isSystem ?? true));
      }
      await publishFlow(flowKey);
      notify(`"${working.name}" is live. The bot uses it within a minute.`);
      await load();
      onChanged();
    } catch (err) {
      captureIssues(err, "Could not publish the flow.");
    } finally {
      setBusy(null);
    }
  };

  const viewVersion = (version: ApiFlowVersion) => {
    setVersionsAnchor(null);
    if (!detail) return;
    const apply = () => adopt(detail, workingFrom(detail, version));
    if (dirty) {
      setConfirm({
        title: "Discard your unsaved changes?",
        body: `You are editing the current working copy. Loading v${version.version} (${version.status.toLowerCase()}) will discard those edits.`,
        action: async () => apply(),
      });
    } else {
      apply();
    }
  };

  const askRollback = (version: ApiFlowVersion) => {
    setVersionsAnchor(null);
    setConfirm({
      title: `Roll back to v${version.version}?`,
      body: "The current live version is archived and this one becomes the version the bot serves.",
      action: async () => {
        setBusy("rollback");
        try {
          await rollbackFlow(flowKey, version.version);
          notify(`Rolled back to v${version.version}.`);
          await load();
          onChanged();
        } catch (err) {
          captureIssues(err, "Could not roll back.");
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const askDelete = () => {
    if (!detail) return;
    setConfirm({
      title: `Delete "${detail.name}"?`,
      body: "Every version of this flow is deleted. The bot will no longer run this conversation.",
      action: async () => {
        setBusy("delete");
        try {
          await deleteFlow(flowKey);
          notify(`"${detail.name}" deleted.`);
          onChanged();
          onBack();
        } catch (err) {
          captureIssues(err, "Could not delete the flow.");
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const isDraftBase = working?.baseStatus === "DRAFT";
  const editorTopicValid = topicIsValid(slugify(working?.topic ?? ""));
  const canPublish = working != null && clientIssues.length === 0 && (isDraftBase || dirty) && editorTopicValid;
  const selectedIndex = working && selectedStepId ? working.definition.steps.findIndex((s) => s.id === selectedStepId) : -1;

  return {
    positions, setPositions, pinPositions, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0,
    addAnchor, addStep, aiDraftOpen, askDelete, askRollback, busy, clientIssues, confirm, detail, dirty, error, issueCountByStep, issues, moveStep, patchDefinition, publish, removeStep, rightTab, save, selectedStepId, setAddAnchor, setAiDraftOpen, setConfirm, setRightTab, setSelectedStepId, setVersionsAnchor, setWorking, updateStep, versionsAnchor, viewVersion, working, isDraftBase, editorTopicValid, canPublish, selectedIndex, known,
  };
}

export type FlowEditor = ReturnType<typeof useFlowEditor>;

/** The editor once the flow has loaded: there is a flow and a working copy to show. */
export type LoadedFlowEditor = FlowEditor & { detail: ApiFlowDetail; working: Working };
