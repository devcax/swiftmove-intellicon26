"use client";

import { useState } from "react";
import { resetInstruction, updateInstruction } from "@/features/advanced/api";
import type { ApiInstruction } from "@/features/advanced/types";

export interface InstructionEditorProps {
  instruction: ApiInstruction;
  notify: (message: string) => void;
  notifyError: (message: string) => void;
  onChanged: () => Promise<void> | void;
}

/** Draft validation and save/reset behavior, shared by the editor's form controls. */
export function useInstructionEditor({ instruction, notify, notifyError, onChanged }: InstructionEditorProps) {
  const [draft, setDraft] = useState(instruction.content);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showDefault, setShowDefault] = useState(false);
  const dirty = draft !== instruction.content;
  const length = draft.trim().length;
  const lengthProblem = length < 20 || length > 20000 ? "Must be 20–20,000 characters." : null;

  const save = async () => {
    if (!dirty || lengthProblem || saving) return;
    setSaving(true);
    try {
      await updateInstruction(instruction.key, draft);
      notify(`"${instruction.label}" saved. New messages use it within a minute.`);
      await onChanged();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not save the instruction.");
    } finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await resetInstruction(instruction.key);
      notify(`"${instruction.label}" is back to the system default.`);
      await onChanged();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not reset the instruction.");
    } finally { setSaving(false); }
  };
  return { draft, setDraft, saving, dirty, lengthProblem, confirmReset, setConfirmReset, showDefault, setShowDefault, save, reset };
}
