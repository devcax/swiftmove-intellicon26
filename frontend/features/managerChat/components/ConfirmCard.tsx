"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import type { ChatEntry } from "../hooks/useManagerChat";

type ConfirmEntry = Extract<ChatEntry, { kind: "confirm" }>;

/** The assistant wants to do something that is hard to undo. Nothing happens until the manager presses Confirm. */
export function ConfirmCard({ entry, onAnswer }: { entry: ConfirmEntry; onAnswer: (decision: "confirm" | "cancel") => void }) {
  const { status, confirmation, note } = entry;
  const open = status === "pending" || status === "working";
  const severity = status === "confirmed" ? "success" : status === "failed" ? "error" : status === "cancelled" ? "info" : "warning";
  return (
    <Alert severity={severity} sx={{ borderRadius: 2, alignItems: "flex-start" }} role="group" aria-label="Confirmation needed">
      <div className="space-y-2">
        <div className="font-semibold">{status === "confirmed" ? "Done" : status === "cancelled" ? "Cancelled" : "Please confirm"}</div>
        <div>{confirmation.summary}</div>
        {status === "failed" && note && <div role="alert">{note}</div>}
        {open && (
          <div className="flex gap-2">
            <Button size="small" variant="contained" color="error" disabled={status === "working"} onClick={() => onAnswer("confirm")}>
              Confirm
            </Button>
            <Button size="small" variant="outlined" disabled={status === "working"} onClick={() => onAnswer("cancel")}>
              Cancel
            </Button>
          </div>
        )}
        {status === "failed" && <div className="text-xs text-slate-600">Ask the assistant again if you still want this.</div>}
      </div>
    </Alert>
  );
}
