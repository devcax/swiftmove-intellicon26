"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { feedback } from "@/shared/feedback/store";
import { describeError } from "@/shared/api/describeError";
import { DeleteDriverDialog } from "@/features/drivers/components/DeleteDriverDialog";
import { DriverFleetSummary } from "@/features/drivers/components/DriverFleetSummary";
import { DriverKpis } from "@/features/drivers/components/DriverKpis";
import { DriverTable } from "@/features/drivers/components/DriverTable";
import { driverMatchesQuery } from "@/features/drivers/format";
import { resendDriverActivation } from "@/features/drivers/api";
import { useDrivers } from "@/features/drivers/hooks/useDrivers";
import type { Driver } from "@/features/drivers/types";

export default function DriversPage() {
  const router = useRouter();
  const { drivers, loadError, setLoadError, reload, changeStatus, removeDriver } = useDrivers();
  const [query, setQuery] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<Driver | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fleet = drivers ?? [];
  const visible = fleet.filter((driver) => driverMatchesQuery(driver, query));

  const resendActivation = async (driver: Driver) => {
    try {
      await resendDriverActivation(driver.id);
      feedback.success(`A new activation link was sent to ${driver.name}.`);
    } catch (err) {
      feedback.error(describeError(err, "Could not send the activation link."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    try {
      await removeDriver(target.id);
      feedback.success(`${target.name} was deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      const message = describeError(err, "Could not delete the driver.");
      setLoadError(message); feedback.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <DriverKpis drivers={drivers} />

      <DriverTable
        drivers={drivers}
        visible={visible}
        query={query}
        onQueryChange={setQuery}
        loadError={loadError}
        onRetry={() => void reload()}
        onEdit={(driver) => router.push(`/drivers/${encodeURIComponent(driver.id)}/edit`)}
        onResendActivation={(driver) => void resendActivation(driver)}
        onStatusChange={(id, status) => void changeStatus(id, status)}
        onDelete={setDeleteTarget}
      />

      <div className="mt-6">
        <DriverFleetSummary drivers={drivers} />
      </div>

      <DeleteDriverDialog
        driver={deleteTarget}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />

    </div>
  );
}
