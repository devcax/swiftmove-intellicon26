"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import StatusChip from "@/components/StatusChip";
import { incidentAction, updateIncidentNotes } from "@/features/incidents/api";
import { releaseDriver } from "@/features/jobs/api";
import type { ApiIncidentDetail } from "@/features/incidents/types";
import { SEVERITY_TONE, STATUS_TONE } from "@/features/incidents/constants";
import { fmtDateTime, humanize } from "@/lib/format";
import { IncidentBadge as Badge } from "./IncidentBadge";

interface IncidentDrawerProps {
  /** The incident being shown; the drawer is open while an id is selected. */
  open: boolean;
  detail: ApiIncidentDetail | null;
  notes: string;
  onNotes: (text: string) => void;
  busy: boolean;
  run: (work: () => Promise<unknown>) => Promise<void>;
  onClose: () => void;
}

/** One incident: what happened, the photos and the manager's notes, with the buttons that move it along. */
export function IncidentDrawer({ open, detail, notes, onNotes, busy, run, onClose }: IncidentDrawerProps) {
  const selectedId = open ? "open" : null;
  return (
      <Drawer anchor="right" open={selectedId !== null} onClose={onClose} sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", sm: 440 } } }}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <Typography sx={{ fontWeight: 800 }}>Incident detail</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </div>

          <div className="slim-scroll flex-1 overflow-y-auto p-5">
            {!detail ? (
              <div className="flex justify-center py-16">
                <CircularProgress size={28} />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={detail.severity} tone={SEVERITY_TONE[detail.severity] ?? SEVERITY_TONE.LOW} />
                  <Badge label={humanize(detail.status)} tone={STATUS_TONE[detail.status] ?? STATUS_TONE.OPEN} />
                  {detail.backupVehicle === "REQUESTED" && (
                    <Badge label="Backup vehicle requested" tone={{ bg: "#fee2e2", fg: "#b91c1c" }} />
                  )}
                  {detail.backupVehicle === "DECLINED" && (
                    <Badge label="No backup needed" tone={{ bg: "#dcfce7", fg: "#15803d" }} />
                  )}
                </div>

                <Typography variant="h6" sx={{ mt: 2, fontWeight: 800 }}>
                  {humanize(detail.type)}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
                  {detail.description ?? "No description given."}
                </Typography>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Job{" "}
                    <Link href={`/jobs/${detail.job.id}`} className="font-bold text-blue-700 no-underline hover:underline">
                      {detail.job.jobNumber}
                    </Link>
                  </Typography>
                  <StatusChip status={detail.job.status} />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Driver: <b>{detail.driver}</b>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Reported {fmtDateTime(detail.reportedAt, "-")}
                  </Typography>
                  {detail.resolvedAt && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Resolved {fmtDateTime(detail.resolvedAt, "-")}
                    </Typography>
                  )}
                </div>

                {detail.location && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <div className="flex items-start gap-1.5">
                      <LocationOnRoundedIcon sx={{ fontSize: 18, color: "#dc2626" }} />
                      <div>
                        <Typography variant="body2">
                          <Link
                            href={`https://www.google.com/maps?q=${detail.location.lat},${detail.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-blue-700 no-underline hover:underline"
                          >
                            Driver location ({detail.location.lat.toFixed(4)}, {detail.location.lng.toFixed(4)})
                            <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
                          </Link>
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          Shared over WhatsApp · {fmtDateTime(detail.location.receivedAt, "-")}
                        </Typography>
                      </div>
                    </div>
                  </>
                )}

                {detail.sourceMessage && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <div className="flex items-start gap-1.5">
                      <FormatQuoteRoundedIcon sx={{ fontSize: 18, color: "#94a3b8", transform: "scaleX(-1)" }} />
                      <div>
                        <Typography variant="body2" sx={{ fontStyle: "italic", color: "#475569" }}>
                          {detail.sourceMessage.text}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          Driver&apos;s original WhatsApp message · {fmtDateTime(detail.sourceMessage.time, "-")}
                        </Typography>
                      </div>
                    </div>
                  </>
                )}

                {detail.attachments.length > 0 && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                      Attachments
                    </Typography>
                    {detail.attachments.map((a) => (
                      <div key={a.id} className="mb-1 flex items-center gap-1.5">
                        {a.publicUrl ? (
                          <LocalOfferRoundedIcon sx={{ fontSize: 15, color: "#1d4ed8" }} />
                        ) : (
                          <AttachFileRoundedIcon sx={{ fontSize: 15, color: "#64748b" }} />
                        )}
                        {a.publicUrl ? (
                          <Typography
                            variant="caption"
                            component="a"
                            href={a.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: "#1d4ed8", fontWeight: 700, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                          >
                            {a.filename ?? humanize(a.type)} - open photo
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {a.filename ?? humanize(a.type)}
                            {a.mimeType ? ` (${a.mimeType})` : ""}
                          </Typography>
                        )}
                      </div>
                    ))}
                  </>
                )}

                <Divider sx={{ my: 3 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                  Manager notes
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  size="small"
                  placeholder="e.g. Mechanic dispatched, ETA 40 min…"
                  value={notes}
                  onChange={(e) => onNotes(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busy || notes === (detail.managerNotes ?? "")}
                    onClick={() => run(() => updateIncidentNotes(detail.id, notes))}
                  >
                    Save Notes
                  </Button>
                </div>
              </>
            )}
          </div>

          {detail && (
            <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4">
              {detail.status === "OPEN" && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  disabled={busy}
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={() => run(() => incidentAction(detail.id, "under-review", notes || undefined))}
                >
                  Start Review
                </Button>
              )}
              {detail.status !== "RESOLVED" && (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={busy}
                    startIcon={<CheckCircleOutlineRoundedIcon />}
                    onClick={() => run(() => incidentAction(detail.id, "resolve", notes || undefined))}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={busy}
                    startIcon={<CheckCircleOutlineRoundedIcon />}
                    onClick={() =>
                      run(async () => {
                        await incidentAction(detail.id, "resolve", notes || undefined);
                        await releaseDriver(
                          detail.job.id,
                          `Released after resolving ${humanize(detail.type).toLowerCase()} incident`,
                        );
                      })
                    }
                  >
                    Resolve &amp; release driver
                  </Button>
                </>
              )}
              {detail.status === "RESOLVED" && (
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy}
                  startIcon={<ReplayRoundedIcon />}
                  onClick={() => run(() => incidentAction(detail.id, "keep-open", notes || undefined))}
                >
                  Reopen
                </Button>
              )}
            </div>
          )}
        </div>
      </Drawer>
  );
}
