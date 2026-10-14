"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import type { LoadedFlowEditor } from "../hooks/useFlowEditor";
import { FlowStatusChips } from "./FlowStatusChips";

/** The flow's name, its version state and the save, publish, history and delete buttons. */
export function FlowVersionBar({ editor, onBack, embedded = false }: { editor: LoadedFlowEditor; onBack: () => void; embedded?: boolean }) {
  const { askDelete, busy, clientIssues, detail, dirty, publish, save, setAiDraftOpen, setVersionsAnchor, working, isDraftBase, editorTopicValid, canPublish } = editor;
  return (
    <>
    {/* version bar */}
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      {!embedded && <Tooltip title="All flows">
        <IconButton size="small" onClick={onBack} aria-label="Back to all flows" sx={{ border: "1px solid", borderColor: "primary.main", color: "primary.main", borderRadius: 1 }}><ArrowBackRoundedIcon /></IconButton>
      </Tooltip>}
      {!embedded && <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{detail.name}</Typography>}
      {!embedded && <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>{detail.key}</Typography>}
      <FlowStatusChips flow={detail} />
      {working.baseStatus !== "DRAFT" && (
        <Chip size="small" variant="outlined" label={dirty ? "editing — save creates a draft" : `viewing v${working.baseVersion} (${working.baseStatus.toLowerCase()})`} />
      )}
      <Box sx={{ flex: 1 }} />
      <Tooltip title="Describe a change in plain words — the AI redrafts the steps">
        <span>
          <Button
            size="small" startIcon={<AutoAwesomeRoundedIcon />}
            disabled={busy != null}
            onClick={() => setAiDraftOpen(true)}
          >
            AI draft
          </Button>
        </span>
      </Tooltip>
      <Button
        size="small" variant="outlined" startIcon={<SaveOutlinedIcon />} disabled={!dirty || busy != null || clientIssues.length > 0 || !editorTopicValid}
        onClick={save}
      >
        {isDraftBase ? "Save draft" : "Save as draft"}
      </Button>
      <Tooltip title={clientIssues.length > 0 ? "Fix the issues below first" : "Validate, then make this the live version"}>
        <span>
          <Button
            size="small" variant="contained" color="success" startIcon={<PublishRoundedIcon />}
            disabled={busy != null || !canPublish || (isDraftBase && dirty)}
            onClick={publish}
          >
            Publish
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Version history">
        <IconButton size="small" onClick={(e) => setVersionsAnchor(e.currentTarget)}><HistoryRoundedIcon /></IconButton>
      </Tooltip>
      {!detail.isSystem && (
        <Tooltip title="Delete flow">
          <IconButton size="small" color="error" disabled={busy != null} onClick={askDelete}>
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
    </>
  );
}
