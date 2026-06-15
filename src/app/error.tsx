"use client";

import { RouteError } from "./_components/route-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      detail={error.message || "Refresh the page or try again."}
      onRetry={reset}
    />
  );
}
