"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { login } from "@/features/auth/api";
import { loginSchema } from "@/features/auth/schemas";
import { safeNextPath } from "@/features/auth/safeNext";
import { ApiError } from "@/shared/api/client";
import { feedback } from "@/shared/feedback/store";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === "email" || field === "password") && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setPending(true);
    try {
      await login(parsed.data);
      feedback.success("Signed in successfully.");
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      router.replace(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not sign in. Please try again.";
      setError(message); feedback.error(message);
      setPassword("");
      setPending(false);
    }
  };

  return (
    <Box component="main" sx={{ minHeight: "100dvh", display: "grid", alignContent: { xs: "start", md: "stretch" }, gridTemplateColumns: { xs: "1fr", md: "minmax(340px, 38%) minmax(0, 1fr)" }, bgcolor: "#eef2fb" }}>
      <Box component="aside" sx={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: { xs: "flex-start", md: "space-between" }, gap: { xs: 3, md: 4 }, textAlign: "center", px: { xs: 3, sm: 5, md: 6, lg: 8 }, pt: { xs: 3, md: 8 }, pb: { xs: 3, md: 5 }, pr: { md: 9, lg: 12 }, minHeight: { md: "100dvh" }, "&::before": { content: '""', position: "absolute", inset: 0, bgcolor: "#fff", clipPath: { xs: "none", md: "polygon(0 0, 100% 0, 88% 100%, 0 100%)" } }, "& > *": { position: "relative" } }}>
        <Box sx={{ width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: { xs: 2, md: 6 } }}>
          <Image
            src="/logo.png"
            alt=""
            width={64}
            height={64}
            priority
            style={{ objectFit: "contain", flexShrink: 0 }}
          />
          <Box><Typography sx={{ fontSize: { xs: 24, lg: 30 }, fontWeight: 800, letterSpacing: "-0.02em", color: "#1e3a8a", lineHeight: 1.2 }}>SwiftMove</Typography><Typography sx={{ fontSize: 12, color: "#475569", mt: 0.5 }}>Logistics Control Room</Typography></Box>
        </Box>
        <Typography component="h2" sx={{ fontSize: { xs: 22, md: 30, lg: 34 }, lineHeight: 1.25, fontWeight: 700, color: "#0f172a", mb: 1 }}>Welcome back!</Typography>
        <Typography sx={{ fontSize: { xs: 12.5, md: 14 }, lineHeight: 1.9, color: "#475569", maxWidth: 300, mx: "auto" }}>Your drivers, jobs, and conversations, together in one control room.</Typography>
        </Box>
        <Box aria-hidden="true" sx={{ width: { xs: 240, sm: 300, md: "100%" }, maxWidth: "min(100%, 420px)", alignSelf: "center", my: { xs: 0, md: 4 } }}>
          <Image src="/login-logistics.png" alt="" width={1440} height={1080} sizes="(min-width: 1400px) 420px, (min-width: 900px) 30vw, (min-width: 600px) 300px, 240px" style={{ display: "block", width: "100%", height: "auto", objectFit: "contain" }} />
        </Box>
        <Typography sx={{ display: { xs: "none", md: "block" }, color: "#64748b", fontSize: 11 }}>SwiftMove Logistics</Typography>
      </Box>
      <Box component="section" aria-labelledby="sign-in-title" sx={{ display: "flex", alignItems: "center", justifyContent: "center", px: { xs: 2, sm: 5, md: 6 }, py: { xs: 4, sm: 5, md: 8 } }}>
      <Box sx={{ width: "100%", maxWidth: 400 }}>
        <Typography id="sign-in-title" component="h1" sx={{ fontSize: { xs: 21, sm: 27 }, textAlign: "center", fontWeight: 700, color: "#0f172a", mb: 1 }}>Sign in to your account</Typography>
        <Typography sx={{ fontSize: 13, textAlign: "center", color: "#475569", lineHeight: 1.8, mb: { xs: 3, md: 4 } }}>Enter your work email and password to continue.</Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2.5, "& .MuiOutlinedInput-root": { bgcolor: "#fff", borderRadius: 1, "& fieldset": { borderColor: "#cbd5e1" } } }}>
          <Box>
          <Typography component="label" htmlFor="sign-in-email" sx={{ display: "block", mb: 1, fontSize: 13, fontWeight: 600, color: "#475569" }}>Email *</Typography>
          <TextField
            id="sign-in-email"
            placeholder="Enter your work email"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
            disabled={pending}
            fullWidth
            required
            slotProps={{ htmlInput: { autoComplete: "username", inputMode: "email" } }}
          />
          </Box>
          <Box>
          <Typography component="label" htmlFor="sign-in-password" sx={{ display: "block", mb: 1, fontSize: 13, fontWeight: 600, color: "#475569" }}>Password *</Typography>
          <TextField
            id="sign-in-password"
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
            disabled={pending}
            fullWidth
            required
            slotProps={{ htmlInput: { autoComplete: "current-password" }, input: { endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={pending} onClick={() => setShowPassword((value) => !value)} onMouseDown={(event) => event.preventDefault()} edge="end">{showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}</IconButton></InputAdornment> } }}
          />
          </Box>

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }} role="alert">
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={pending}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              bgcolor: "#1e3a8a",
              py: 1.4,
              fontWeight: 700,
              "&:hover": { bgcolor: "#172554" },
            }}
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </Box>
        <Typography sx={{ mt: 3, textAlign: "center", fontSize: 12, color: "#475569", lineHeight: 1.8 }}>Need access? Contact your organization administrator.</Typography>
      </Box>
      </Box>
    </Box>
  );
}
