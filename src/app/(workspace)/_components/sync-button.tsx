"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SyncState = "idle" | "syncing" | "synced";

export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<SyncState>("idle");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function sync() {
    if (state === "syncing") return;
    setState("syncing");
    window.dispatchEvent(new Event("koda:data-refresh"));
    router.refresh();
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setState("synced");
      timeoutRef.current = window.setTimeout(() => setState("idle"), 2500);
    }, 1100);
  }

  const label =
    state === "syncing" ? "Syncing…" : state === "synced" ? "Synced" : "Sync";

  return (
    <button
      type="button"
      onClick={sync}
      disabled={state === "syncing"}
      className="tap inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-70"
      title="Sync Gmail & Calendar"
    >
      {state === "syncing" ? (
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M8 2.5a5.5 5.5 0 1 0 5.5 5.5" />
        </svg>
      ) : (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            state === "synced"
              ? "bg-[var(--color-success)]"
              : "animate-pulse bg-[var(--color-success)]"
          }`}
        />
      )}
      <span className="font-mono tracking-[0.04em]">{label}</span>
    </button>
  );
}
