"use client";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { initials } from "@/lib/format";
import type { Conversation } from "../types";

/** Operational details of the selected driver thread; no inferred presence or personal data. */
export function DriverChatDetails({ conversation }: { conversation: Conversation }) {
  const media = conversation.messages.flatMap(message => message.attachments ?? []).filter(attachment => attachment.publicUrl);
  return <Box className="panel-scroll" component="aside" aria-label="Driver and conversation details" sx={{ height: "100%", overflowY: "auto", px: 2.5, py: 3 }}>
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", mb: 3 }}>
      <Avatar sx={{ width: 80, height: 80, bgcolor: "#eef2ff", color: "#1e3a8a", fontSize: 27, fontWeight: 600, mb: 2 }}>{initials(conversation.driver)}</Avatar>
      <Typography component="h2" sx={{ fontWeight: 700, fontSize: 15 }}>{conversation.driver}</Typography>
      <Chip size="small" icon={conversation.verified ? <VerifiedRoundedIcon /> : undefined} label={conversation.verified ? "Verified WhatsApp" : "Not verified"} sx={{ mt: 1, bgcolor: conversation.verified ? "#ecfdf5" : "#f1f5f9", color: conversation.verified ? "#047857" : "#475569", fontSize: 10.5 }} />
    </Box>
    <Box component="dl" sx={{ m: 0, "& dt": { fontSize: 11, color: "#64748b", mb: 0.5 }, "& dd": { m: 0, mb: 2.5, fontSize: 12.5, fontWeight: 500, color: "#253047", overflowWrap: "anywhere" } }}>
      <Typography component="dt">WhatsApp number</Typography><Typography component="dd">{conversation.phone || "Not available"}</Typography>
      <Typography component="dt">Linked job</Typography><Typography component="dd">{conversation.jobNumber}</Typography>
      <Typography component="dt">Conversation handling</Typography><Typography component="dd">{conversation.aiPaused ? "Manager takeover · AI paused" : "AI dispatcher enabled"}</Typography>
      <Typography component="dt">Last message</Typography><Typography component="dd">{conversation.lastActivity || "No messages yet"}</Typography>
    </Box>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
      {conversation.jobId && <Button component={Link} href={`/jobs/${conversation.jobId}`} variant="contained" size="small">View job</Button>}
      {conversation.driverId && <Button component={Link} href={`/drivers/${conversation.driverId}`} variant="outlined" size="small">View driver profile</Button>}
    </Box>
    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Shared attachments <Box component="span" sx={{ color: "#64748b", fontWeight: 400 }}>({media.length})</Box></Typography>
    {media.length === 0 ? <Typography sx={{ color: "#64748b", fontSize: 11.5 }}>Photos and documents shared in this thread appear here.</Typography> : <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
      {media.map(attachment => <Box component="a" key={attachment.id} href={attachment.publicUrl!} target="_blank" rel="noreferrer" sx={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1", overflow: "hidden", bgcolor: "#f1f5f9", borderRadius: 1, color: "#475569", textDecoration: "none" }}>
        {attachment.type === "IMAGE" ? <Box component="img" src={attachment.publicUrl!} alt={attachment.filename ?? "Shared photo"} loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Typography sx={{ fontSize: 10, p: 0.5, overflowWrap: "anywhere" }}>{attachment.filename ?? attachment.type}</Typography>}
      </Box>)}
    </Box>}
  </Box>;
}
