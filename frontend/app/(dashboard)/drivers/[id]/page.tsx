import { DriverProfilePage } from "@/features/drivers/components/DriverProfilePage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverProfilePage key={id} driverId={id} />;
}
