"use client";

import * as React from "react";
import type { ApiJobDetail } from "../../types";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

export function DriverBlock({ job }: { job: ApiJobDetail }) {
  
  return (
    <div className="flex flex-col justify-between py-2 lg:col-span-2 lg:px-4 lg:py-0">
      <div className="flex items-center gap-2">
        <PersonRoundedIcon sx={{ color: "#2563eb", fontSize: 18 }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#64748b",
          }}
        >
          Driver
        </Typography>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {job.assignment ? (
          <>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
              }}
            >
              {job.assignment.driver.name.slice(0, 2).toUpperCase()}
            </Avatar>
            <div className="min-w-0 flex-1">
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
                noWrap
              >
                {job.assignment.driver.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: "block",
                  lineHeight: 1.2,
                }}
                noWrap
              >
                {job.assignment.driver.phone}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "#64748b",
                  display: "block",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {job.assignment.status.replace(/_/g, " ")}
              </Typography>
            </div>
          </>
        ) : (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontStyle: "italic" }}
          >
            Unassigned
          </Typography>
        )}
      </div>
    </div>
  );
}
