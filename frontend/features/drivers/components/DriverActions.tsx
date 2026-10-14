import Box from "@mui/material/Box";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { TableActionButton } from "@/shared/components/TableActionButton";
import type { Driver, DriverStatus } from "../types";

export function DriverActions({ driver, onEdit, onResendActivation, onStatusChange, onDelete }: {
  driver: Driver; onEdit: (driver: Driver) => void; onResendActivation: (driver: Driver) => void; onStatusChange: (id: string, status: DriverStatus) => void; onDelete: (driver: Driver) => void;
}) {
  return <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.75 }}>
    <TableActionButton label={`Edit ${driver.name}`} icon={<EditOutlinedIcon />} onClick={() => onEdit(driver)} />
    {!driver.verified && <TableActionButton label={`Send ${driver.name} a new activation link`} icon={<SendRoundedIcon />} onClick={() => onResendActivation(driver)} />}
    {driver.status !== "SUSPENDED" && <TableActionButton label={driver.status === "ACTIVE" ? "Deactivate bot access" : "Activate bot access"}
      tone={driver.status === "ACTIVE" ? "neutral" : "success"} icon={<PowerSettingsNewRoundedIcon />} onClick={() => onStatusChange(driver.id, driver.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")} />}
    <TableActionButton label={driver.status === "SUSPENDED" ? "Restore access" : "Suspend driver"} tone={driver.status === "SUSPENDED" ? "success" : "warning"}
      icon={driver.status === "SUSPENDED" ? <RestoreRoundedIcon /> : <BlockRoundedIcon />} onClick={() => onStatusChange(driver.id, driver.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED")} />
    <TableActionButton label={`Delete ${driver.name}`} tone="danger" icon={<DeleteOutlineRoundedIcon />} onClick={() => onDelete(driver)} />
  </Box>;
}
