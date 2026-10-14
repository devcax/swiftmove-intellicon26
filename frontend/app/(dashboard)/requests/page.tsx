"use client";

import * as React from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { CancellationsTable } from "@/features/requests/components/CancellationsTable";
import { ClosuresTable } from "@/features/requests/components/ClosuresTable";
import { QueueTabs } from "@/features/requests/components/QueueTabs";
import { RequestHistoryTable } from "@/features/requests/components/RequestHistoryTable";
import { QueueOverview } from "@/features/requests/components/QueueOverview";
import { RequestsTable } from "@/features/requests/components/RequestsTable";
import { useRequestQueue } from "@/features/requests/hooks/useRequestQueue";
import type { QueueTab } from "@/features/requests/types";

export default function DriverRequestsPage() {
  const queue = useRequestQueue();
  const [activeTab, setActiveTab] = React.useState<QueueTab>("requests");
  const pendingCount = queue.requests?.length ?? 0;
  const historyCount = queue.requestHistory?.length ?? 0;
  const closureCount = queue.closureJobs?.length ?? 0;
  const cancelCount = queue.cancelJobs?.length ?? 0;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1500px] flex-col gap-6 p-4 sm:p-6">
      <div className="flex w-full shrink-0 flex-row items-center justify-between gap-3">
        <Button component={Link} href="/jobs" variant="outlined" size="small" sx={{ bgcolor: "#fff", flexShrink: 0 }}>
          View Jobs
        </Button>
      </div>

      <QueueOverview pendingCount={pendingCount} cancelCount={cancelCount} closureCount={closureCount} history={queue.requestHistory} loading={queue.requests === null || queue.cancelJobs === null || queue.closureJobs === null} error={queue.error} onTab={setActiveTab} />

      {queue.actionError && (
        <Paper className="shrink-0" sx={{ p: 1.5, bgcolor: "#fef2f2", border: "1px solid #fecaca" }} role="alert">
          <Typography variant="body2" sx={{ color: "#b91c1c", fontWeight: 600 }}>{queue.actionError}</Typography>
        </Paper>
      )}

      <Paper sx={{ borderRadius: 1.5, overflow: "hidden", minWidth: 0, boxShadow: "0 2px 6px rgba(15,23,42,0.04)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
      <Typography component="h2" sx={{ fontWeight: 700, fontSize: 18 }}>Driver requests</Typography>
      <QueueTabs
        activeTab={activeTab} onChange={setActiveTab}
        pendingCount={pendingCount} cancelCount={cancelCount} closureCount={closureCount} historyCount={historyCount}
      />
      </div>
      <div className="px-5 pb-2 pt-3" role="tabpanel" id={`queue-panel-${activeTab}`} aria-labelledby={`queue-tab-${activeTab}`}>
      {activeTab === "requests" && <RequestsTable requests={queue.requests} error={queue.error} busyId={queue.busyId} onDecide={(r, d) => void queue.decide(r, d)} />}
      {activeTab === "history" && <RequestHistoryTable requestHistory={queue.requestHistory} error={queue.error} />}
      {activeTab === "cancellations" && (
        <CancellationsTable cancelJobs={queue.cancelJobs} error={queue.error} busyId={queue.cancelBusyId} onAct={(j, a) => void queue.decideCancellation(j, a)} />
      )}
      {activeTab === "closures" && (
        <ClosuresTable closureJobs={queue.closureJobs} error={queue.error} busyId={queue.closureBusyId} onClose={(j) => void queue.closeJob(j)} />
      )}
      </div>
      </Paper>
    </div>
  );
}
