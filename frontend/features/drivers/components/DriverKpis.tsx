import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { SectionPreloader } from "@/shared/components/SectionPreloader";
import type { Driver } from "../types";

export function DriverKpis({ drivers }: { drivers: Driver[] | null }) {
  const fleet = drivers ?? [];
  const cards = [
    { label: "Registered drivers", value: fleet.length, hint: "Across your fleet", color: "#1e3a8a", bg: "#fff", icon: <PeopleAltOutlinedIcon /> },
    { label: "Active drivers", value: fleet.filter((driver) => driver.status === "ACTIVE").length, hint: "Bot access enabled", color: "#fff", bg: "#0f766e", icon: <VerifiedUserOutlinedIcon /> },
    { label: "On a job", value: fleet.filter((driver) => driver.currentJob).length, hint: "Currently assigned", color: "#fff", bg: "#1e3a8a", icon: <LocalShippingOutlinedIcon /> },
    { label: "Completed trips", value: fleet.reduce((sum, driver) => sum + driver.completedTrips, 0), hint: "Across registered drivers", color: "#fff", bg: "#6d28d9", icon: <TaskAltRoundedIcon /> },
  ];
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "repeat(4, 1fr)" }, gap: 3, mb: 3 }}>
    {cards.map((card) => <Paper key={card.label} component="section" sx={{ border: 0, borderRadius: 1.5, p: 2.5, bgcolor: drivers ? card.bg : "#fff", color: card.color, minHeight: 130 }}>
      {!drivers ? <SectionPreloader label={`Loading ${card.label.toLowerCase()}…`} /> : <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box aria-hidden="true" sx={{ width: 50, height: 50, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: card.bg === "#fff" ? "#edf2fc" : "rgba(255,255,255,0.16)", flexShrink: 0 }}>{card.icon}</Box>
        <Box><Typography sx={{ fontSize: 12, fontWeight: 500 }}>{card.label}</Typography><Typography sx={{ fontSize: 28, fontWeight: 700, my: 0.25 }}>{card.value.toLocaleString()}</Typography><Typography sx={{ fontSize: 11, color: card.bg === "#fff" ? "#64748b" : "#fff" }}>{card.hint}</Typography></Box>
      </Box>}
    </Paper>)}
  </Box>;
}
