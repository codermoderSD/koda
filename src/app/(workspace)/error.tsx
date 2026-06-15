"use client";

import { RouteError } from "../_components/route-state";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      title="Workspace failed to load"
      detail={error.message || "KODA could not load this workspace surface."}
      onRetry={reset}
    />
  );
}
