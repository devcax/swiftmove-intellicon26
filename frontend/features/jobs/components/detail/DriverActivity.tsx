"use client";

import * as React from "react";
import Chip from "@mui/material/Chip";
import { JobDetailPanel } from "./JobDetailPanel";
import Typography from "@mui/material/Typography";
import { fmtTime, intentTone } from "../../detail";
import type { ApiJobActivityMessage } from "../../types";

/** The WhatsApp messages of the job (what the driver sent, what the bot and managers answered), with the photos pinned on top. */
export function DriverActivity({ activity, isLive }: { activity: ApiJobActivityMessage[]; isLive: boolean }) {
  const mediaAttachments = activity.flatMap((m) => m.attachments.filter((a) => a.type === "IMAGE" || a.type === "DOCUMENT"));
  return (
          <JobDetailPanel>
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <div className="flex items-center gap-2">
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                  Driver Activity
                </Typography>
                {isLive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                WhatsApp stream
              </span>
            </div>

            {/* Pinned Media Gallery */}
            {mediaAttachments.length > 0 && (
              <div className="panel-scroll mb-2.5 flex shrink-0 items-center gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                  Media ({mediaAttachments.length})
                </span>
                <div className="flex gap-2 min-w-0">
                  {mediaAttachments.map((att) =>
                    att.type === "IMAGE" && att.publicUrl ? (
                      <a
                        key={att.id}
                        href={att.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative h-12 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-white"
                      >
                        <img
                          src={att.publicUrl}
                          alt={att.filename ?? "attachment"}
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        />
                      </a>
                    ) : (
                      <a
                        key={att.id}
                        href={att.publicUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-12 w-20 shrink-0 flex-col items-center justify-center rounded border border-slate-200 bg-white px-1 text-center no-underline hover:bg-slate-100"
                      >
                        <span className="w-full truncate text-[10px] font-semibold text-slate-700">
                          {att.filename ?? att.type}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {fmtTime(att.createdAt)}
                        </span>
                      </a>
                    ),
                  )}
                </div>
              </div>
            )}

            {activity.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center">
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontSize: 12 }}
                >
                  No messages or WhatsApp updates received yet.
                </Typography>
              </div>
            ) : (
              <div className="panel-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-3" role="region" aria-label="Driver activity messages" tabIndex={0}>
                {[...activity].reverse().map((msg) => {
                  const isBot = msg.kind === "BOT";
                  const isDriver = msg.kind === "DRIVER";
                  const tone = msg.interpretation
                    ? intentTone(msg.interpretation.status)
                    : null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col rounded-lg p-2.5 text-xs transition-colors ${
                        isBot
                          ? "bg-slate-100/70 border border-slate-200/80 text-slate-800"
                          : isDriver
                            ? "bg-emerald-50/50 border border-emerald-100 text-slate-900"
                            : "bg-blue-50/50 border border-blue-100 text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${
                            isBot
                              ? "bg-slate-200 text-slate-700"
                              : isDriver
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {msg.kind}
                        </span>

                        {msg.interpretation && tone && (
                          <Chip
                            size="small"
                            label={`${msg.interpretation.intent.replace(/_/g, " ")} · ${Math.round(
                              msg.interpretation.confidence * 100,
                            )}%`}
                            sx={{
                              bgcolor: tone.bg,
                              color: tone.fg,
                              fontWeight: 700,
                              fontSize: 9.5,
                              height: 18,
                              px: 0.2,
                            }}
                          />
                        )}

                        <span className="ml-auto text-[10px] text-slate-400">
                          {fmtTime(msg.time)}
                        </span>
                      </div>

                      {msg.text && (
                        <div className="mt-1.5 text-[12px] font-normal leading-snug break-words text-slate-800">
                          {msg.text}
                        </div>
                      )}

                      {msg.interpretation &&
                        msg.interpretation.fields.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1 border-t border-slate-200/50 pt-1">
                            {msg.interpretation.fields.map((f, i) => (
                              <span
                                key={i}
                                className="text-[10px] text-slate-500 font-mono"
                              >
                                <span className="font-semibold text-slate-700">
                                  {f.label}:
                                </span>{" "}
                                {f.value}
                              </span>
                            ))}
                          </div>
                        )}

                      {msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {msg.attachments.map((att) =>
                            att.type === "IMAGE" && att.publicUrl ? (
                              <a
                                key={att.id}
                                href={att.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 w-10 overflow-hidden rounded border border-slate-300"
                              >
                                <img
                                  src={att.publicUrl}
                                  alt="preview"
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            ) : (
                              <span
                                key={att.id}
                                className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium border border-slate-200 text-slate-600"
                              >
                                📎 {att.filename ?? att.type}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </JobDetailPanel>
  );
}
