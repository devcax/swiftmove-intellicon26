"use client";

import * as React from "react";
import type { ApiJobDetail } from "../../types";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";

export function RouteBlock({ job }: { job: ApiJobDetail }) {
  const pickup = job.stops.find((s) => s.type === "PICKUP");
  const delivery = job.stops.find((s) => s.type === "DELIVERY");
  return (
    <div className="flex flex-col justify-between py-2 pr-0 lg:col-span-4 lg:py-0 lg:pr-5">
      <div className="flex items-center gap-2">
        <LocalShippingRoundedIcon
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
          Route
        </Typography>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="shrink-0">
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              lineHeight: 1.25,
            }}
          >
            {pickup?.name ?? "—"}
          </Typography>
          {pickup?.address && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mt: 0.5,
                lineHeight: 1.25,
              }}
              title={pickup.address}
            >
              {pickup.address.replace(
                new RegExp(`^${pickup.name}?[,\\s]*`, "i"),
                "",
              ) || pickup.address}
            </Typography>
          )}
        </div>

        <ArrowForwardRoundedIcon
          sx={{
            color: "#94a3b8",
            flexShrink: 0,
            fontSize: 16,
          }}
        />

        <div className="shrink-0">
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              lineHeight: 1.25,
            }}
          >
            {delivery?.name ?? "—"}
          </Typography>
          {delivery?.address && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mt: 0.5,
                lineHeight: 1.25,
              }}
              title={delivery.address}
            >
              {delivery.address.replace(
                new RegExp(`^${delivery.name}?[,\\s]*`, "i"),
                "",
              ) || delivery.address}
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
}
