"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import { SectionPreloader } from "./SectionPreloader";
import { EmptyState } from "./EmptyState";

export interface DataTableColumn<Row> {
  key: string;
  label: string;
  render: (row: Row, index: number) => ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string | number;
  label: string;
  emptyMessage?: string;
  loading?: boolean;
  pageSize?: number;
  minWidth?: number;
  renderActions?: (row: Row) => ReactNode;
  variant?: "plain" | "striped";
  scrollMode?: "contained" | "page";
  compact?: boolean;
  singleLine?: boolean;
  pinActions?: boolean;
}

/** Shared table presentation, scrolling, empty/loading states, pagination, and optional actions. */
export function DataTable<Row>({ columns, rows, getRowKey, label, emptyMessage = "No records to display.", loading = false, pageSize = 8, minWidth = 760, renderActions, variant = "plain", scrollMode = "contained", compact = false, singleLine = false, pinActions = false }: DataTableProps<Row>) {
  const [page, setPage] = useState(0);
  const size = Math.max(1, pageSize);
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / size) - 1));
  const visible = rows.slice(current * size, (current + 1) * size);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: scrollMode === "contained" ? "100%" : "auto", minHeight: 0 }} aria-busy={loading}>
      <Box className="panel-scroll" sx={scrollMode === "contained"
        ? { flex: 1, minHeight: 0, overflow: "auto", paddingInlineEnd: 1.5 }
        : { overflowX: "auto", scrollbarGutter: "auto" }}>
        {loading ? <SectionPreloader label={`Loading ${label.toLowerCase()}…`} /> : rows.length === 0 ? <EmptyState title={emptyMessage} description="Records will appear here when they become available." /> : <Table stickyHeader={scrollMode === "contained"} aria-label={label} sx={{ minWidth,
          border: variant === "striped" ? "1px solid #e5e7eb" : 0,
          "& .MuiTableCell-root": { px: compact ? 1 : 1.5, verticalAlign: "middle", lineHeight: 1.5 },
          "& .MuiTableCell-head": { bgcolor: "#fff", color: "#0f172a", textTransform: "none", letterSpacing: 0, fontSize: 12.5, fontWeight: 600, py: compact ? 0.75 : 1, whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" },
          "& .MuiTableCell-body": { py: compact ? 0.5 : 0.75, color: "#64748b", fontSize: 12, borderBottom: 0, overflowWrap: "anywhere" },
          "& .MuiTableHead-root .MuiTableRow-root": { height: 40 },
          "& .MuiTableBody-root .MuiTableRow-root": { height: compact ? 40 : 48 },
          ...(variant === "striped" ? {
            "& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)": { bgcolor: "#f5f5f5" },
            "& .MuiTableCell-root:not(:last-child)": { borderRight: "1px solid #e5e7eb" },
            "& .MuiTableCell-body": { py: 1.5, color: "#475569", fontSize: 12.5, borderBottom: "1px solid #eef0f4", overflowWrap: "anywhere" },
          } : {}),
          ...(singleLine ? {
            "& .MuiTableCell-body, & .MuiTableCell-body .MuiTypography-root": { whiteSpace: "nowrap", overflowWrap: "normal" },
          } : {}),
          ...(pinActions ? {
            "& .data-table-actions-cell": { position: "sticky", right: 0, zIndex: 1, bgcolor: "#fff", borderLeft: "1px solid #eef0f4", whiteSpace: "nowrap", width: 1 },
            "& .MuiTableCell-head.data-table-actions-cell": { zIndex: 3 },
            ...(variant === "striped" ? { "& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd) .data-table-actions-cell": { bgcolor: "#f5f5f5" } } : {}),
          } : {}),
        }}>
          <TableHead><TableRow>
            {columns.map((column) => <TableCell key={column.key} align={column.align} scope="col" sx={{ width: column.width }}>{column.label}</TableCell>)}
            {renderActions && <TableCell className="data-table-actions-cell" align="right" scope="col">Actions</TableCell>}
          </TableRow></TableHead>
          <TableBody>
            {visible.map((row, index) => <TableRow key={getRowKey(row)}>
                {columns.map((column) => <TableCell key={column.key} align={column.align}>{column.render(row, current * size + index)}</TableCell>)}
                {renderActions && <TableCell className="data-table-actions-cell" align="right">{renderActions(row)}</TableCell>}
              </TableRow>)}
          </TableBody>
        </Table>}
      </Box>
      <TablePagination component="div" count={rows.length} page={current} rowsPerPage={size} rowsPerPageOptions={[]}
        onPageChange={(_, next) => setPage(next)} sx={{
          flexShrink: 0, borderTop: "1px solid #eef0f4",
          "& .MuiTablePagination-toolbar": { height: 48, minHeight: 48, px: 1, py: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1.5 },
          "& .MuiTablePagination-spacer": { display: "none" },
          "& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel": { m: 0, fontSize: 12, lineHeight: 1.5 },
          "& .MuiTablePagination-actions": { m: 0, display: "flex", alignItems: "center", gap: 0.5 },
          "& .MuiIconButton-root": { width: 32, height: 32, p: 0 },
          "& .MuiSvgIcon-root": { fontSize: 20 },
        }} />
    </Box>
  );
}
