"use client";

import * as React from "react";
import { reportClientError } from "@/shared/api/reportClientError";
import { ErrorScreen } from "@/shared/components/ErrorScreen";

/** A page crashed. Show a safe message with a retry, and report the crash to the backend log. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <ErrorScreen
      title="Something went wrong"
      message="This page hit a problem. It has been reported. Try again, and if it keeps happening, tell your administrator."
      onRetry={reset}
      homeHref="/"
    />
  );
}
