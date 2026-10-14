"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { LoadedFlowEditor } from "../hooks/useFlowEditor";

/** What is wrong with the flow, with a click to jump to the step. */
export function FlowIssues({ editor }: { editor: LoadedFlowEditor }) {
  const { clientIssues, issues, setSelectedStepId } = editor;
  return (
    <>
    {/* validation issues */}
    {issues.length > 0 && (
      <Alert severity={clientIssues.length > 0 ? "warning" : "error"} sx={{ borderRadius: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {clientIssues.length > 0 ? "Fix these before publishing:" : "The server rejected the definition:"}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {issues.slice(0, 12).map((issue, i) => (
            <li key={i}>
              <Typography variant="caption">
                {issue.step && (
                  <Box
                    component="span"
                    onClick={() => setSelectedStepId(issue.step)}
                    sx={{ fontFamily: "monospace", fontWeight: 700, color: "primary.main", cursor: "pointer", mr: 0.75 }}
                  >
                    {issue.step}
                  </Box>
                )}
                {issue.message}
              </Typography>
            </li>
          ))}
          {issues.length > 12 && <li><Typography variant="caption">…and {issues.length - 12} more</Typography></li>}
        </Box>
      </Alert>
    )}
    </>
  );
}
