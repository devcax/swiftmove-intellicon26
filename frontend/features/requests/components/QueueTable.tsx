"use client";

import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";

export function QueueTable<Row extends { id: string }>({ rows, columns, label, emptyMessage, error, renderActions }: {
  rows: Row[] | null; columns: DataTableColumn<Row>[]; label: string; emptyMessage: string;
  error: string | null; renderActions?: (row: Row) => ReactNode;
}) {
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  return <DataTable rows={rows ?? []} columns={columns} getRowKey={row => row.id} label={label}
    emptyMessage={emptyMessage} loading={rows === null} renderActions={renderActions}
    scrollMode="page" compact singleLine pinActions pageSize={8} />;
}
