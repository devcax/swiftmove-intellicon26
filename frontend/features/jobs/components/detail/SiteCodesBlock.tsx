"use client";

import * as React from "react";
import type { ApiJobDetail } from "../../types";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { CopyableText } from "@/shared/components/CopyableText";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import { markJobVerified } from "../../api";

export function SiteCodesBlock({ job, busy, run }: { job: ApiJobDetail; busy: boolean; run: (work: () => Promise<unknown>) => Promise<void> }) {
  const finalStatuses = ["COMPLETED", "CANCELLED"];
  return (
    <div className="flex flex-col justify-between py-2 lg:col-span-2 lg:py-0 lg:pl-4">
      <div className="flex items-center gap-1.5">
        <VerifiedUserRoundedIcon
          sx={{ color: "#2563eb", fontSize: 18 }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#64748b",
          }}
        >
          Site Codes
        </Typography>
      </div>

      <Box sx={{ display: 'grid', gridTemplateColumns: '40px max-content 76px', columnGap: 1, rowGap: 1, alignItems: 'center', mt: 2 }}>
        {[
          {
            label: "Pickup",
            code: job.pickupCode,
            verifiedAt: job.pickupVerifiedAt,
            stage: "PICKUP" as const,
          },
          {
            label: "Drop",
            code: job.deliveryCode,
            verifiedAt: job.deliveryVerifiedAt,
            stage: "DELIVERY" as const,
          },
        ].map(({ label, code, verifiedAt, stage }) => (
          <div
            key={stage}
            className="contents text-xs"
          >
            <div className="contents">
              <span className="w-10 shrink-0 text-[11px] font-medium text-slate-500">
                {label}
              </span>
              {code ? (
                <div className="flex shrink-0 items-center whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-[12px] text-slate-800">
                  <CopyableText value={code} label={`${label} code`} />
                </div>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 28, width: 76 }}>
              {verifiedAt ? (
                <Chip
                  size="small"
                  label="Verified"
                  sx={{
                    bgcolor: "#dcfce7",
                    color: "#15803d",
                    fontWeight: 700,
                    fontSize: 10,
                    height: 18,
                  }}
                />
              ) : code && !finalStatuses.includes(job.status) ? (
                <Button
                  size="small"
                  variant="text"
                  sx={{
                    minWidth: 76,
                    minHeight: 28,
                    px: 1,
                    py: 0.5,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "none",
                    bgcolor: 'transparent',
                    '&:hover': { bgcolor: 'transparent' },
                    '&.Mui-focusVisible': { outline: '2px solid #2563eb', outlineOffset: 2 },
                  }}
                  disabled={busy}
                  onClick={() =>
                    run(() => markJobVerified(job.id, stage))
                  }
                >
                  Verify
                </Button>
              ) : null}
            </Box>
          </div>
        ))}
      </Box>
    </div>
  );
}
