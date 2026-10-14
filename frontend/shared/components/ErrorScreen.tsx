import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

interface ErrorScreenProps {
  title: string;
  message: string;
  /** Shown as a button when given. */
  onRetry?: () => void;
  /** A link shown next to it, for example back to the dashboard. */
  homeHref?: string;
}

/** A calm full-page message. It only ever shows the text it is given, never an error's own message or stack. */
export function ErrorScreen({ title, message, onRetry, homeHref }: ErrorScreenProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
        {message}
      </Typography>
      <div className="mt-2 flex gap-2">
        {onRetry && (
          <Button variant="contained" onClick={onRetry} sx={{ bgcolor: "#1e3a8a", "&:hover": { bgcolor: "#172554" } }}>
            Try again
          </Button>
        )}
        {homeHref && (
          <Button variant="outlined" href={homeHref}>
            Back to the dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
