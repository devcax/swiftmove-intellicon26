"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Link from "next/link";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import Typography from "@mui/material/Typography";
import type { ApiOverviewAiEvent } from "@/features/overview/types";
import { OverviewPanel } from "./OverviewPanel";
import { EmptyState } from "@/shared/components/EmptyState";

const feedTone: Record<string, { bg: string; fg: string }> = {
  success: { bg: "#e8f7ee", fg: "#15803d" },
  warning: { bg: "#fef3c7", fg: "#b45309" },
  error: { bg: "#fdecec", fg: "#b91c1c" },
  info: { bg: "#e7effe", fg: "#1d4ed8" },
};

/** The latest things the bot understood from drivers. */
export function AiExtractionFeed({ events }: { events: ApiOverviewAiEvent[] }) {
  return (
  <OverviewPanel title="Recent AI activity" height={440} subtitle="Latest driver messages understood by the assistant" href="/conversations">
    <div className={events.length === 0 ? "flex h-full flex-col" : "flex flex-col"}>
      {events.length === 0 && (
        <EmptyState title="No AI activity yet" description="Newly interpreted driver messages will appear here." icon={<AutoAwesomeRoundedIcon />} />
      )}
      {events.map((event) => {
        const tone = feedTone[event.tone] ?? feedTone.info;
        return (
          <Box
            component={event.jobId ? Link : "div"}
            href={event.jobId ? `/jobs/${encodeURIComponent(event.jobId)}` : undefined}
            key={event.id}
            className="flex items-start gap-3 border-b border-dashed border-slate-200 py-4 first:pt-0 last:border-0 last:pb-0"
            sx={{ textDecoration: "none", color: "inherit", borderRadius: 1, "&:hover": event.jobId ? { "& .MuiTypography-root:first-of-type": { textDecoration: "underline" } } : {}, "&:focus-visible": { outline: "2px solid #1e3a8a", outlineOffset: 2 } }}
          >
            <Avatar variant="rounded" sx={{ width: 42, height: 42, bgcolor: tone.bg, color: tone.fg, flexShrink: 0 }}><AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} /></Avatar>
            <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: tone.fg,
                  fontSize: 12.5,
                }}
              >
                {event.intent.replace(/_/g, " ")}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}
              >
                {event.confidence}% confidence
              </Typography>
            </div>
            <Typography
              variant="caption"
              sx={{ display: "block", mt: 0.75, color: "#64748b", fontSize: 12, lineHeight: 1.7, overflowWrap: "anywhere" }}
            >
              {event.detail}
            </Typography>
            </div>
          </Box>
        );
      })}
    </div>
  </OverviewPanel>
  );
}
