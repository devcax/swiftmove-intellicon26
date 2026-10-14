"use client";

import * as React from "react";
import { reportClientError } from "@/shared/api/reportClientError";

/**
 * The last resort: the root layout itself crashed, so there is no theme or page chrome to rely on. This replaces the
 * whole document, so it brings its own html and body and uses plain styles.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f1f5f9", color: "#0f172a" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
          <p style={{ margin: 0, color: "#475569", maxWidth: 420 }}>
            The dashboard hit a problem and has reported it. Try again, and if it keeps happening, tell your administrator.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 8, padding: "10px 18px", border: 0, borderRadius: 8, background: "#1e3a8a", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
