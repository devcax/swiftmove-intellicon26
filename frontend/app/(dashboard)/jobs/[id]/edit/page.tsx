import { JobFormPage } from "@/features/jobs/components/JobFormPage";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobFormPage jobId={id} />;
}
