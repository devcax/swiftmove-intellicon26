"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Paper from "@mui/material/Paper";
import { feedback } from "@/shared/feedback/store";
import { DeleteJobDialog } from "@/features/jobs/components/DeleteJobDialog";
import { JobKpiCards } from "@/features/jobs/components/JobKpiCards";
import { JobsTable } from "@/features/jobs/components/JobsTable";
import { JobsToolbar } from "@/features/jobs/components/JobsToolbar";
import { useJobs, type Notify } from "@/features/jobs/hooks/useJobs";
import { JobOperationsWidgets } from "@/features/jobs/components/JobOperationsWidgets";
import type { Job, JobStatus } from "@/features/jobs/types";
import { matchesJobStatus } from '@/features/jobs/statusGroups';


const matches = (job: Job, query: string) => {
  const needle = query.trim().toLowerCase();
  return needle === ""
    || job.jobNumber.toLowerCase().includes(needle)
    || (job.driver ?? "").toLowerCase().includes(needle)
    || job.origin.toLowerCase().includes(needle)
    || job.destination.toLowerCase().includes(needle);
};

export default function JobsPage() {
  const router = useRouter();
  const notify: Notify = React.useCallback((severity, message) => feedback.toast(severity, message), []);
  const { jobList, loadError, reload, isBusy, isPending, activate, deactivate, remove } = useJobs(notify);
  const [tab, setTab] = React.useState<"ALL" | JobStatus>("ALL");
  const [query, setQuery] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<Job | null>(null);

  const jobs = jobList ?? [];
  const countFor = (value: "ALL" | JobStatus) => jobs.filter(job => matchesJobStatus(job.status, value)).length;
  const visibleJobs = jobs.filter(job => matchesJobStatus(job.status, tab) && matches(job, query));

  const confirmDelete = async () => {
    if (deleteTarget && (await remove(deleteTarget))) setDeleteTarget(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] p-3 sm:p-6">
      <JobKpiCards tab={tab} onTab={setTab} countFor={countFor} loading={jobList === null} />

      <Paper sx={{ border: 0, borderRadius: 1.5, overflow: "hidden" }}>
        <JobsToolbar shown={visibleJobs.length} total={jobs.length} query={query} onQuery={setQuery} />
        <JobsTable
          key={`${tab}:${query}`}
          jobs={jobList === null ? null : visibleJobs}
          loadError={loadError}
          onRetry={() => void reload()}
          isBusy={isBusy}
          isPending={isPending}
          onEdit={(job) => job.id && router.push(`/jobs/${job.id}/edit`)}
          onToggle={(job) => void (job.status === "CANCELLED" ? activate(job) : deactivate(job))}
          onDelete={setDeleteTarget}
        />
      </Paper>

      <JobOperationsWidgets />
      <DeleteJobDialog job={deleteTarget} pending={isPending(deleteTarget?.id, "delete")} onClose={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />

    </div>
  );
}
