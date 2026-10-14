import { EmptyState } from "@/shared/components/EmptyState";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import { OverviewPanel } from "./OverviewPanel";

/** Keep the dashboard structure visible while each section loads. */
export function OverviewLoading({ error }: { error: string | null }) {
  const pending = (title: string, height: number) => (
    <OverviewPanel title={title} height={height} loading={!error}>
      <EmptyState title="Data unavailable" description="Use Retry above to load this section." icon={<CloudOffOutlinedIcon />} />
    </OverviewPanel>
  );
  return <>
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-6">
        {pending("Operations metrics", 300)}
        {pending("Workload snapshot", 380)}
        {pending("Open incidents", 300)}
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        {pending("Delivery health", 400)}
        {pending("Recent AI activity", 440)}
      </div>
    </div>
    {pending("Active deliveries", 400)}
  </>;
}
