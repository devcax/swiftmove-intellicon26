import { DriverFormPage } from "@/features/drivers/components/DriverFormPage";

export default async function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverFormPage mode="edit" driverId={id} />;
}
