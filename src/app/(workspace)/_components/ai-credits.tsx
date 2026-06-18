"use client";

import { useCallback, useEffect, useState } from "react";

type Quota = { used: number; remaining: number; limit: number };

export function AiCredits({ initial }: { initial: Quota }) {
  const [quota, setQuota] = useState<Quota>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/koda/usage", { cache: "no-store" });
      if (res.ok) setQuota((await res.json()) as Quota);
    } catch {
      // keep last known value
    }
  }, []);

  useEffect(() => {
    // Re-read after each AI request the command bar fires.
    const onAiUsed = () => {
      void refresh();
    };
    window.addEventListener("koda:ai-used", onAiUsed);
    return () => window.removeEventListener("koda:ai-used", onAiUsed);
  }, [refresh]);

  const pct = quota.limit > 0 ? (quota.remaining / quota.limit) * 100 : 0;
  const low = quota.remaining <= 3;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="kicker">AI credits</span>
        <span
          className={`font-mono text-[11px] ${
            low ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"
          }`}
        >
          {quota.remaining}/{quota.limit}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-panel-strong)]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            low ? "bg-[var(--color-danger)]" : "bg-[var(--color-accent)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--color-text-soft)]">
        {quota.remaining > 0
          ? `${quota.remaining} left today`
          : "Limit reached, resets tomorrow"}
      </p>
    </div>
  );
}
