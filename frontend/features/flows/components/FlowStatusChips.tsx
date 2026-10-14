"use client";

import Chip from "@mui/material/Chip";

export function FlowStatusChips({ flow }: { flow: { publishedVersion: number | null; draftVersion: number | null; enabled: boolean } }) {
  return (
    <>
      {flow.publishedVersion != null && (
        <Chip size="small" color={flow.enabled ? "success" : "default"} label={`live · v${flow.publishedVersion}`} />
      )}
      {flow.draftVersion != null && <Chip size="small" color="warning" variant="outlined" label={`draft · v${flow.draftVersion}`} />}
      {flow.publishedVersion == null && flow.draftVersion == null && <Chip size="small" variant="outlined" label="no versions" />}
    </>
  );
}
