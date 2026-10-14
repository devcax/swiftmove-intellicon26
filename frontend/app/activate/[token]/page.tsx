"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { confirmActivation, lookupActivation, type ActivationInfo } from "@/features/activation/api";
import { ApiError } from "@/shared/api/client";

type View = { kind: "loading" } | { kind: "ready" | "verified"; firstName: string } | { kind: "problem"; message: string };

const NOT_VALID = "This activation link is not valid. Ask your fleet manager to send you a new one.";
const EXPIRED = "This activation link has expired. Ask your fleet manager to send you a new one.";
const fromInfo = (info: ActivationInfo): View => (info.state === "expired" ? { kind: "problem", message: EXPIRED } : { kind: info.state, firstName: info.firstName });
const problem = (err: unknown): View => ({ kind: "problem", message: err instanceof ApiError && err.status !== 0 ? err.message : "Could not reach the server. Please try again." });

/** The page behind the link a new driver gets on WhatsApp. Public: the random part of the address is what proves it is theirs. */
export default function ActivatePage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = React.useState<View>({ kind: "loading" });
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    let current = true;
    lookupActivation(token).then((info) => { if (current) setView(fromInfo(info)); }).catch((err) => { if (current) setView(problem(err)); });
    return () => { current = false; };
  }, [token]);

  const activate = async () => {
    setPending(true);
    try { setView(fromInfo(await confirmActivation(token))); } catch (err) { setView(problem(err)); } finally { setPending(false); }
  };

  return <Box component="main" sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", px: 2, py: 4, bgcolor: "#eef2fb" }}>
    <Box sx={{ width: "100%", maxWidth: 420, bgcolor: "#fff", borderRadius: 3, boxShadow: "0 4px 24px rgba(15,23,42,0.08)", p: { xs: 3, sm: 4 }, textAlign: "center" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25, mb: 3 }}>
        <Image src="/logo.png" alt="" width={44} height={44} priority style={{ objectFit: "contain" }} />
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a" }}>SwiftMove</Typography>
      </Box>
      {view.kind === "loading" && <CircularProgress aria-label="Checking your link" />}
      {view.kind === "ready" && <>
        <Typography component="h1" sx={{ fontSize: 22, fontWeight: 700, color: "#0f172a", mb: 1 }}>Hi {view.firstName}!</Typography>
        <Typography sx={{ fontSize: 14, color: "#475569", lineHeight: 1.7, mb: 3 }}>Press the button to confirm this is your WhatsApp number. Once it is activated you can chat with the dispatch assistant.</Typography>
        <Button fullWidth size="large" variant="contained" disabled={pending} onClick={() => void activate()}
          startIcon={pending ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ bgcolor: "#1e3a8a", py: 1.4, fontWeight: 700, "&:hover": { bgcolor: "#172554" } }}>
          {pending ? "Activating…" : "Activate my number"}
        </Button>
      </>}
      {view.kind === "verified" && <>
        <CheckCircleRoundedIcon aria-hidden="true" sx={{ fontSize: 56, color: "#15803d", mb: 1 }} />
        <Typography component="h1" sx={{ fontSize: 22, fontWeight: 700, color: "#0f172a", mb: 1 }}>You are all set, {view.firstName}!</Typography>
        <Typography sx={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>Your number is verified. A welcome message is on its way to your WhatsApp. You can close this page.</Typography>
      </>}
      {view.kind === "problem" && <>
        <ErrorOutlineRoundedIcon aria-hidden="true" sx={{ fontSize: 56, color: "#b45309", mb: 1 }} />
        <Typography component="h1" sx={{ fontSize: 20, fontWeight: 700, color: "#0f172a", mb: 1 }}>Link not working</Typography>
        <Typography role="alert" sx={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{view.message || NOT_VALID}</Typography>
      </>}
    </Box>
  </Box>;
}
