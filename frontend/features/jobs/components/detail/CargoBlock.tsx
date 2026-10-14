"use client";

import * as React from "react";
import type { ApiJobDetail } from "../../types";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";

export function CargoBlock({ job }: { job: ApiJobDetail }) {
  
  return (
    <div className="flex flex-col justify-between py-2 lg:col-span-2 lg:px-4 lg:py-0">
      <div className="flex items-center gap-2">
        <Inventory2RoundedIcon
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
          Cargo
        </Typography>
      </div>

      <div className="mt-2 min-w-0">
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, lineHeight: 1.25 }}
          noWrap
          title={job.cargo}
        >
          {job.cargo || "General Freight"}
        </Typography>

        {job.items.map((item) => {
          const isRedundant =
            item.description.trim().toLowerCase() ===
            (job.cargo ?? "").trim().toLowerCase();
          return (
            <Typography
              key={item.description}
              variant="caption"
              sx={{
                display: "block",
                color: "text.secondary",
                mt: 0.25,
              }}
            >
              {isRedundant
                ? item.quantity
                  ? `${item.quantity} Units`
                  : ""
                : `${item.description}${item.quantity ? ` · ${item.quantity}` : ""}`}
            </Typography>
          );
        })}

        {job.specialInstructions && (
          <Chip
            size="small"
            label={job.specialInstructions}
            sx={{
              mt: 0.75,
              bgcolor: "#fef3c7",
              color: "#92400e",
              fontWeight: 600,
              fontSize: 10,
              height: 20,
            }}
          />
        )}
      </div>
    </div>
  );
}
