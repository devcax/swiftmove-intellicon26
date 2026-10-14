"use client";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import type { LoadedFlowEditor } from "../hooks/useFlowEditor";

/** The versions of the flow, to view or roll back to. */
export function FlowVersionsMenu({ editor }: { editor: LoadedFlowEditor }) {
  const { askRollback, detail, setVersionsAnchor, versionsAnchor, viewVersion, working } = editor;
  return (
    <>
    {/* versions menu */}
    <Menu anchorEl={versionsAnchor} open={Boolean(versionsAnchor)} onClose={() => setVersionsAnchor(null)}>
      {detail.versions.map((version) => (
        <MenuItem key={version.version} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontFamily: "monospace", minWidth: 32 }}>v{version.version}</Typography>
          <Chip
            size="small"
            color={version.status === "PUBLISHED" ? "success" : version.status === "DRAFT" ? "warning" : "default"}
            variant={version.status === "ARCHIVED" ? "outlined" : "filled"}
            label={version.status.toLowerCase()}
          />
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {new Date(version.updatedAt).toLocaleString()}
          </Typography>
          {version.version !== working.baseVersion && (
            <Button size="small" onClick={() => viewVersion(version)}>view</Button>
          )}
          {version.status === "ARCHIVED" && (
            <Button size="small" color="warning" onClick={() => askRollback(version)}>rollback</Button>
          )}
        </MenuItem>
      ))}
    </Menu>
    </>
  );
}
