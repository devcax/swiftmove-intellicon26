import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

/** A local loading indicator that occupies its section, never the full screen. */
export function SectionPreloader({ label = "Loading…" }: { label?: string }) {
  return (
    <Box role="status" aria-live="polite" sx={{ minHeight: 120, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
      <CircularProgress size={26} thickness={3} aria-hidden="true" sx={{ "@media (prefers-reduced-motion: reduce)": { animation: "none", "& .MuiCircularProgress-circle": { animation: "none" } } }} />
      <Typography sx={{ fontSize: 12, color: "#64748b" }}>{label}</Typography>
    </Box>
  );
}
