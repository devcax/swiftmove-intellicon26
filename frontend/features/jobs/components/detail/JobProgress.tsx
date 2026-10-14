"use client";

import * as React from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import Box from '@mui/material/Box';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import type { PendingProofProgress } from '../../proofProgress';
import { LADDER, TRACK_INSET } from "../../workflow";

interface JobProgressProps {
  /** The step the job has reached on the ladder. */
  ladderIndex: number;
  awaitingDriverConfirmation: boolean;
  pendingProof?: PendingProofProgress | null;
}

/** The progress track from published to completed. */
export function JobProgress({ ladderIndex, awaitingDriverConfirmation, pendingProof }: JobProgressProps) {
  const displayIndex = pendingProof?.index ?? ladderIndex;
  return (
      <Paper sx={{ px: 3, py: 2 }} className="w-full shrink-0">
        <Typography sx={{ fontWeight: 800, mb: 1.5, fontSize: 15 }}>
          Progress
        </Typography>
        <div className="relative">
          <div
            className="absolute top-[5px] h-0.5 rounded-full bg-slate-200"
            style={{ left: `${TRACK_INSET}%`, right: `${TRACK_INSET}%` }}
          />
          <div
            className="absolute top-[5px] h-0.5 rounded-full bg-blue-600 transition-all motion-reduce:transition-none"
            style={{
              left: `${TRACK_INSET}%`,
              width: `${((100 - TRACK_INSET * 2) * ladderIndex) / (LADDER.length - 1)}%`,
            }}
          />
          {pendingProof && <div className="absolute top-[5px] border-t-2 border-dashed border-amber-500"
            style={{ left: `${TRACK_INSET + ((100 - TRACK_INSET * 2) * ladderIndex) / (LADDER.length - 1)}%`, width: `${((100 - TRACK_INSET * 2) * (displayIndex - ladderIndex)) / (LADDER.length - 1)}%` }} />}
          <div className="relative flex justify-between">
            {LADDER.map((step, i) => {
              const awaitingAssignedStep =
                awaitingDriverConfirmation && step.key === "ASSIGNED";
              const reached = i <= ladderIndex && !awaitingAssignedStep;
              const awaitingProof = pendingProof?.index === i;
              const current = i === displayIndex;
              const nearCurrent = Math.abs(i - displayIndex) <= 1 || i === ladderIndex;
              return (
                <div
                  key={step.key}
                  className="flex flex-1 flex-col items-center"
                >
                  <span className="relative flex h-3 w-3 items-center justify-center">
                    {current && (
                      <span className={`absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full opacity-60 ${awaitingProof ? 'border-2 border-amber-500' : 'bg-blue-400'}`} />
                    )}
                    <span
                      className="relative inline-flex h-2.5 w-2.5 rounded-full"
                      style={{
                        background: awaitingAssignedStep || awaitingProof
                          ? "#fff"
                          : reached
                            ? "#2563eb"
                            : "#cbd5e1",
                        border: awaitingProof ? '2px solid #d97706' : awaitingAssignedStep
                          ? "2px solid #2563eb"
                          : undefined,
                      }}
                    />
                  </span>
                  <span
                    className={`mt-1 text-center text-[11px] font-medium leading-tight ${
                      awaitingProof ? 'font-bold text-amber-800' : current ? "font-bold text-blue-700" : "text-slate-500"
                    } ${nearCurrent ? "" : "hidden sm:block"}`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {pendingProof && <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, p: 1.25, border: '1px solid #fcd34d', borderRadius: 1, bgcolor: '#fffbeb' }}>
          <DescriptionOutlinedIcon sx={{ color: '#92400e', fontSize: 20 }} />
          <Box><Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Waiting for {pendingProof.stage === 'PICKUP' ? 'pickup' : 'delivery'} proof</Typography>
            <Typography sx={{ fontSize: 12, color: '#78350f', mt: 0.25 }}>Driver reported {pendingProof.milestone === 'LOADED' ? 'cargo loaded' : 'delivery complete'}. The milestone will be confirmed after the document and code are verified.</Typography></Box>
        </Box>}
        {awaitingDriverConfirmation && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2">
            <PersonRoundedIcon sx={{ color: "#2563eb", fontSize: 18 }} />
            <Typography
              variant="body2"
              sx={{ color: "#1e40af", fontWeight: 600 }}
            >
              Awaiting driver confirmation.
            </Typography>
          </div>
        )}
      </Paper>
  );
}
