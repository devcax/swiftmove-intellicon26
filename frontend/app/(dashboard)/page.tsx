"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { ActiveJobsBoard } from "@/features/overview/components/ActiveJobsBoard";
import { AiExtractionFeed } from "@/features/overview/components/AiExtractionFeed";
import { KpiCards } from "@/features/overview/components/KpiCards";
import { OpenIncidents } from "@/features/overview/components/OpenIncidents";
import { useOverview } from "@/features/overview/hooks/useOverview";
import { WorkloadChart } from "@/features/overview/components/WorkloadChart";
import { DeliverySummary } from "@/features/overview/components/DeliverySummary";
import { OverviewLoading } from "@/features/overview/components/OverviewLoading";

export default function OperationsOverviewPage() {
  const { data, error, reload, history } = useOverview();
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-3 sm:p-6">
      {error && (
        <Alert
          severity="warning"
          className="shrink-0"
          sx={{ borderRadius: 2 }}
          action={<Button color="inherit" size="small" onClick={() => void reload()}>Retry</Button>}
        >
          {error}
        </Alert>
      )}

      {data === null && <OverviewLoading error={error} />}

      {data && (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-6">
              <KpiCards kpis={data.kpis} history={history} />
              <WorkloadChart kpis={data.kpis} />
              <OpenIncidents incidents={data.openIncidents} />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <DeliverySummary jobs={data.activeJobs} />
              <AiExtractionFeed events={data.recentAiEvents} />
            </div>
          </div>
          <ActiveJobsBoard jobs={data.activeJobs} />
        </>
      )}
    </div>
  );
}
