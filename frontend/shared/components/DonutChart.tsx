import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export interface DonutSegment { label: string; value: number; color: string }

/** Accessible count distribution, with a textual legend supplied by its caller. */
export function DonutChart({ segments, label }: { segments: DonutSegment[]; label: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return <Box sx={{ width: 170, height: 170, position: "relative", flexShrink: 0 }}>
    <svg viewBox="0 0 120 120" width="170" height="170" role="img" aria-label={`${label}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`}>
      <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="12" />
      {segments.map((segment, index) => {
        const share = total ? segment.value / total * 100 : 0;
        const start = total ? segments.slice(0, index).reduce((sum, previous) => sum + previous.value, 0) / total * 100 : 0;
        return <circle key={segment.label} cx="60" cy="60" r="48" fill="none" stroke={segment.color} strokeWidth="12" pathLength="100"
          strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 60 60)" />;
      })}
    </svg>
    <Box aria-hidden="true" sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <Typography sx={{ fontSize: 28, fontWeight: 700 }}>{total}</Typography><Typography sx={{ fontSize: 12, color: "#64748b" }}>Drivers</Typography>
    </Box>
  </Box>;
}
