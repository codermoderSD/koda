"use client";

import { useState, useTransition } from "react";

import type { UserSettings } from "~/server/koda/settings";
import { saveSettings } from "./actions";

const VIEWS = [
  { value: "inbox", label: "Workspace" },
  { value: "commitments", label: "Commitments" },
  { value: "calendar", label: "Calendar" },
] as const;

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`tap flex h-5 w-9 shrink-0 items-center rounded-full border px-0.5 transition-colors ${
        checked
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
          : "border-[var(--color-line-strong)] bg-[var(--color-panel-strong)]"
      }`}
    >
      <span
        className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-[margin] duration-200 ${
          checked ? "ml-auto" : "ml-0"
        }`}
      />
    </button>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[var(--color-text)]">
          {title}
        </p>
        <p className="mt-0.5 text-[12px] leading-5 text-[var(--color-text-soft)]">
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function ProfileForm({ initial }: { initial: UserSettings }) {
  const [form, setForm] = useState<UserSettings>(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  function save() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveSettings(form);
      setStatus(result.ok ? "Preferences saved." : result.error);
    });
  }

  const selectClass =
    "rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-1.5 text-[13px] text-[var(--color-text)] outline-none";

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)]">
      <div className="border-b border-[var(--color-line)] px-5 py-3.5">
        <p className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-text)] uppercase">
          Preferences
        </p>
      </div>

      <div className="divide-y divide-[var(--color-line)]">
        <Row
          title="Default view"
          description="Where KODA lands when you open the workspace."
        >
          <select
            value={form.defaultView}
            onChange={(e) =>
              setForm((f) => ({ ...f, defaultView: e.target.value }))
            }
            className={selectClass}
          >
            {VIEWS.map((view) => (
              <option key={view.value} value={view.value}>
                {view.label}
              </option>
            ))}
          </select>
        </Row>

        <Row
          title="Commitment confidence"
          description="Minimum confidence before KODA surfaces an extracted commitment."
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(form.commitmentConfidenceThreshold * 100)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  commitmentConfidenceThreshold: Number(e.target.value) / 100,
                }))
              }
              className="w-32 accent-[var(--color-accent)]"
            />
            <span className="w-9 text-right font-mono text-[12px] text-[var(--color-text-muted)]">
              {Math.round(form.commitmentConfidenceThreshold * 100)}%
            </span>
          </div>
        </Row>

        <Row
          title="Auto-draft follow-ups"
          description="Let KODA pre-write follow-up replies for open commitments."
        >
          <Toggle
            checked={form.autoDraftFollowups}
            onChange={(next) =>
              setForm((f) => ({ ...f, autoDraftFollowups: next }))
            }
          />
        </Row>

        <Row
          title="Follow-up lead time"
          description="Hours before a deadline to nudge you about a commitment."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={168}
              value={form.followupLeadTimeHours}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  followupLeadTimeHours: Math.max(
                    1,
                    Math.min(168, Number(e.target.value) || 1),
                  ),
                }))
              }
              className="w-16 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1.5 text-[13px] text-[var(--color-text)] outline-none"
            />
            <span className="text-[12px] text-[var(--color-text-soft)]">
              hours
            </span>
          </div>
        </Row>

        <Row
          title="Keyboard shortcuts"
          description="Enable ⌘K command bar and quick navigation shortcuts."
        >
          <Toggle
            checked={form.keyboardShortcutsEnabled}
            onChange={(next) =>
              setForm((f) => ({ ...f, keyboardShortcutsEnabled: next }))
            }
          />
        </Row>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] px-5 py-3.5">
        <span
          className={`text-[12px] ${
            status === "Preferences saved."
              ? "text-[var(--color-success)]"
              : status
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-text-soft)]"
          }`}
        >
          {status ?? (dirty ? "Unsaved changes" : "All changes saved")}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="tap rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-[var(--color-accent-strong)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </section>
  );
}
