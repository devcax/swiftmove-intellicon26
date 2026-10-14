"use client";

import * as React from "react";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { eventDetails, eventProvenance, fmtTime } from "../../detail";
import type { ApiTimelineEvent } from "../../types";
import { EVENT_STATUS_TONE } from "../../workflow";
import { JobDetailPanel } from "./JobDetailPanel";

function eventColor(event: ApiTimelineEvent, fallback: string) {
  if (event.status !== "APPLIED") return fallback;
  if (/CANCEL|DELAY|EXCEPTION/.test(event.type)) return "#d97706";
  if (/COMPLETE|END_JOB/.test(event.type)) return "#15803d";
  if (/DOCUMENT|VERIFIED/.test(event.type)) return "#2563eb";
  if (/DELIVER/.test(event.type)) return "#0f766e";
  if (/PICKUP|START/.test(event.type)) return "#7c3aed";
  return "#475569";
}

/** What happened on the job, newest first. */
export function EventTimeline({ timeline }: { timeline: ApiTimelineEvent[] }) {
  return (
          <JobDetailPanel>
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <div className="flex items-center gap-2">
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                  Event Timeline
                </Typography>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {timeline.length}
                </span>
              </div>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontSize: 11 }}
              >
                Reverse chronological
              </Typography>
            </div>

            {timeline.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center">
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontSize: 12 }}
                >
                  No events recorded yet. Updates appear here automatically.
                </Typography>
              </div>
            ) : (
              <div className="panel-scroll min-h-0 flex-1 overflow-y-auto pr-3" role="region" aria-label="Job event timeline" tabIndex={0}>
                <div className="relative pl-8 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-[2px] before:bg-slate-200">
                  {[...timeline].reverse().map((event) => {
                    const tone =
                      EVENT_STATUS_TONE[event.status] ??
                      EVENT_STATUS_TONE.PROPOSED;
                    const details = eventDetails(event.data);
                    const provenance = eventProvenance(event.data);
                    const color = eventColor(event, tone.fg);

                    return (
                      <div key={event.id} className="relative pb-5 last:pb-1">
                        <div
                          className="absolute -left-8 top-2 h-4 w-4 rounded-full border-4 border-white"
                          style={{ backgroundColor: color, boxShadow: `0 0 0 2px ${color}25` }}
                        />

                        <Box sx={{ position: "relative", borderLeft: "3px solid", borderColor: color, pl: 1.75, py: 0.5,
                          "&::before": { content: '""', position: "absolute", left: -9, top: 10, width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderRight: `6px solid ${color}` },
                        }}>
                          <Typography component="time" dateTime={event.time} sx={{ display: "block", fontSize: 11, color: "#64748b", mb: 0.75 }}>{fmtTime(event.time)}</Typography>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 tracking-tight">
                              {event.type.replace(/_/g, " ")}
                            </span>

                            <Chip
                              size="small"
                              label={event.status.toLowerCase()}
                              sx={{
                                bgcolor: tone.bg,
                                color: tone.fg,
                                fontWeight: 700,
                                fontSize: 9.5,
                                height: 18,
                                px: 0.2,
                                textTransform: "capitalize",
                              }}
                            />

                            {provenance && (
                              <Tooltip title={provenance.title ?? ""}>
                                <Chip
                                  size="small"
                                  label={provenance.label}
                                  sx={{
                                    bgcolor: provenance.bg,
                                    color: provenance.fg,
                                    fontWeight: 600,
                                    fontSize: 9.5,
                                    height: 18,
                                    px: 0.2,
                                  }}
                                />
                              </Tooltip>
                            )}

                            {event.confidence != null && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 text-[10px] font-semibold text-blue-700">
                                <AutoAwesomeRoundedIcon sx={{ fontSize: 10 }} />
                                {Math.round(event.confidence * 100)}%
                              </span>
                            )}

                          </div>

                          {event.sourceMessage && (
                            <p className="mt-1 text-[11px] italic text-slate-600 line-clamp-2">
                              “{event.sourceMessage}”
                            </p>
                          )}

                          {details.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {details.map((d, i) => (
                                <span
                                  key={i}
                                  className="max-w-full break-words rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </Box>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </JobDetailPanel>
  );
}
