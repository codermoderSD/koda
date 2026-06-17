"use client";

import { useState } from "react";

import type { EmailAlias } from "~/server/koda/aliases";

const INPUT =
  "w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition";

export function AliasesClient({
  initialAliases,
}: {
  initialAliases: EmailAlias[];
}) {
  const [aliases, setAliases] = useState(initialAliases);
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function add() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/koda/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: alias.replace(/^@/, ""),
          email,
          label: label || undefined,
        }),
      });
      const data = (await res.json()) as { alias?: EmailAlias; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save alias.");
      if (data.alias) {
        setAliases((prev) => {
          const filtered = prev.filter((a) => a.id !== data.alias!.id);
          return [...filtered, data.alias!].sort((a, b) =>
            a.alias.localeCompare(b.alias),
          );
        });
        setAlias("");
        setEmail("");
        setLabel("");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save alias.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/koda/aliases/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setAliases((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Add form */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5">
        <p className="kicker mb-4 text-[var(--color-accent)]">New alias</p>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-[13px] text-[var(--color-accent)]">
                @
              </span>
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value.replace(/^@/, ""))}
                placeholder="handle"
                className="w-36 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] py-2 pr-3 pl-7 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] transition focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              type="email"
              className={INPUT}
            />
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Display name (optional)"
            className={INPUT}
          />
          {err && (
            <p className="text-[12px] text-[var(--color-danger)]">{err}</p>
          )}
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy || !alias.trim() || !email.trim()}
            className="self-end rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Add alias"}
          </button>
        </div>
      </div>

      {/* Alias list */}
      {aliases.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] px-6 py-10 text-center">
          <p className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-text-soft)] uppercase">
            No aliases yet
          </p>
          <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
            Add one above, or click{" "}
            <span className="font-mono text-[var(--color-accent)]">
              + alias
            </span>{" "}
            next to any sender in your inbox.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)]">
          <div className="grid grid-cols-[auto_1fr_auto] divide-y divide-[var(--color-line)]">
            {aliases.map((a) => (
              <div
                key={a.id}
                className="col-span-3 grid grid-cols-subgrid items-center gap-4 px-4 py-3.5 transition hover:bg-[var(--color-panel)]"
              >
                <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[12px] font-medium text-[var(--color-accent)]">
                  @{a.alias}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-[var(--color-text)]">
                    {a.email}
                  </p>
                  {a.label && (
                    <p className="truncate text-[12px] text-[var(--color-text-soft)]">
                      {a.label}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(a.id)}
                  disabled={deletingId === a.id}
                  className="shrink-0 rounded-[var(--radius-sm)] px-2 py-1 text-[11px] text-[var(--color-text-soft)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:opacity-60"
                >
                  {deletingId === a.id ? "…" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
