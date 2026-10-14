"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { type ChatMessage } from "@/features/conversations/types";
import * as React from "react";

export function renderWhatsAppText(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, index) =>
    part.length > 2 && part.startsWith("*") && part.endsWith("*") ? (
      <strong key={index}>{part.slice(1, -1)}</strong>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
  );
}

export function StatusTick({ status }: { status?: ChatMessage["deliveryStatus"] }) {
  if (status === "FAILED") return <ErrorOutlineRoundedIcon sx={{ fontSize: 13, color: "#dc2626" }} />;
  if (status === "QUEUED") return <ScheduleRoundedIcon sx={{ fontSize: 13, color: "#94a3b8" }} />;
  if (status === "SENT") return <CheckRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />;
  if (status === "READ") return <DoneAllRoundedIcon sx={{ fontSize: 13, color: "#53bdeb" }} />;
  return <DoneAllRoundedIcon sx={{ fontSize: 13, color: "#94a3b8" }} />;
}
