import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/** Small percentage ring with its category and count below it. */
export function CircularMetric({ label, value, description, color = "#1e3a8a", loading = false }: {
  label: string; value: number; description: string; color?: string; loading?: boolean;
}) {
  const percent = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0.75 }}>
    <Box sx={{ position: "relative", width: 88, height: 88, mb: 0.75 }}>
      <svg viewBox="0 0 100 100" role="img" aria-label={loading ? `${label}: loading` : `${label}: ${Math.round(percent)} percent`}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="11" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="11" pathLength="100" strokeDasharray={`${loading ? 0 : percent} 100`} transform="rotate(-90 50 50)" />
      </svg>
      <Typography aria-hidden="true" sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700 }}>{loading ? "—" : `${Math.round(percent)}%`}</Typography>
    </Box>
    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{label}</Typography>
    <Typography sx={{ fontSize: 11.5, color: "#64748b" }}>{description}</Typography>
  </Box>;
}
