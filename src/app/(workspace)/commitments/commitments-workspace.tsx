"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { KodaCommitment } from "~/server/koda/commitments";

function formatDeadline(value: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function confidenceLabel(value: string | null) {
  if (!value) return "unknown";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  return `${Math.round(numeric * 100)}%`;
}

function Lane({
  title,
  count,
  countLabel,
  children,
}: {
  title: string;
  count: number;
  countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)]">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
        <h2 className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-text)] uppercase">
          {title}
        </h2>
        <span className="font-mono text-[11px] text-[var(--color-text-soft)]">
          {count} {countLabel}
        </span>
      </div>
      <div className="stagger divide-y divide-[var(--color-line)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {children}
      </div>
    </section>
  );
}

function EmptyLane({ kind }: { kind: "outbound" | "inbound" }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-text-soft)]">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {kind === "outbound" ? (
            <path d="M5 12l4 4 10-10" />
          ) : (
            <>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5v5l3 2" />
            </>
          )}
        </svg>
      </span>
      <p className="text-[13px] font-medium text-[var(--color-text)]">
        {kind === "outbound" ? "Nothing promised yet" : "Nobody owes you yet"}
      </p>
      <p className="mt-1 max-w-[220px] text-[12px] leading-5 text-[var(--color-text-soft)]">
        Run “Extract from recent mail” and KODA surfaces{" "}
        {kind === "outbound"
          ? "what you committed to"
          : "what others committed"}{" "}
        here.
      </p>
    </div>
  );
}

function CommitmentCard({ item }: { item: KodaCommitment }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"done" | "remove" | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [reminded, setReminded] = useState(false);
  const deadlineTime = item.deadline ? new Date(item.deadline).getTime() : null;
  const overdue = deadlineTime !== null ? deadlineTime < Date.now() : false;
  const dueSoon =
    deadlineTime !== null &&
    !overdue &&
    deadlineTime <= Date.now() + 48 * 60 * 60 * 1000;
  const expired = item.status === "expired";

  async function mutate(method: "PATCH" | "DELETE", kind: "done" | "remove") {
    setBusy(kind);
    try {
      const response = await fetch(
        `/api/koda/commitments/${encodeURIComponent(item.id)}`,
        { method },
      );
      if (!response.ok) throw new Error("request failed");
      router.refresh();
    } catch {
      setBusy(null);
    }
  }

  async function draftReminder() {
    if (!item.counterpartyEmail) return;
    setReminderBusy(true);
    setReminderStatus(null);
    try {
      const when = item.deadline
        ? ` (due ${formatDeadline(item.deadline)})`
        : "";
      const subject = `Reminder: ${item.sourceSubject ?? item.actionSummary}`;
      const body =
        item.type === "INBOUND"
          ? `Hi,\n\nJust following up on ${item.actionSummary}${when}. Could you share an update when you get a chance?\n\nThanks!`
          : `Hi,\n\nA quick note that I'm following up on ${item.actionSummary}${when}. I'll keep you posted.\n\nThanks!`;
      const response = await fetch("/api/koda/gmail/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [item.counterpartyEmail],
          subject,
          body,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Could not draft reminder.");
      }
      setReminderStatus("Reminder drafted in Gmail.");
      setReminded(true);
    } catch (error) {
      setReminderStatus(
        error instanceof Error ? error.message : "Could not draft reminder.",
      );
    } finally {
      setReminderBusy(false);
    }
  }

  return (
    <article className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14px] leading-5 font-medium text-[var(--color-text)]">
          {item.actionSummary}
        </h3>
        <span
          className={`shrink-0 rounded-[var(--radius-sm)] px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap ${
            overdue || expired
              ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
              : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
          }`}
        >
          {formatDeadline(item.deadline)}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-5 text-[var(--color-text-soft)]">
        {item.sourceSubject ?? "Untitled thread"}
        {item.counterpartyEmail ? ` · ${item.counterpartyEmail}` : ""}
      </p>
      {item.rawQuote && (
        <p className="mt-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-2 text-[12px] leading-5 text-[var(--color-text-muted)]">
          {item.rawQuote}
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-[var(--color-text-soft)] uppercase">
          {(overdue || dueSoon) && (
            <span
              className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 ${
                overdue
                  ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                  : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
              }`}
            >
              {overdue ? "Overdue" : "Due soon"}
            </span>
          )}
          <span className={expired ? "text-[var(--color-danger)]" : undefined}>
            {item.status}
          </span>
          <span>{confidenceLabel(item.confidence)} confidence</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.counterpartyEmail && !reminded && (
            <button
              type="button"
              onClick={() => void draftReminder()}
              disabled={reminderBusy}
              title={`Draft a reminder to ${item.counterpartyEmail}`}
              className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-60"
            >
              {reminderBusy ? "…" : "Remind"}
            </button>
          )}
          {reminded && (
            <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-accent)] uppercase">
              Reminded ✓
            </span>
          )}
          <button
            type="button"
            onClick={() => void mutate("PATCH", "done")}
            disabled={busy !== null}
            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-line-strong)] hover:text-[var(--color-text)] disabled:opacity-60"
          >
            {busy === "done" ? "…" : "Done"}
          </button>
          <button
            type="button"
            onClick={() => void mutate("DELETE", "remove")}
            disabled={busy !== null}
            className="rounded-[var(--radius-sm)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-soft)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:opacity-60"
          >
            {busy === "remove" ? "…" : "Remove"}
          </button>
        </div>
      </div>
      {reminderStatus && (
        <p className="mt-2 text-[11px] text-[var(--color-text-soft)]">
          {reminderStatus}
        </p>
      )}
    </article>
  );
}

export function CommitmentsWorkspace({
  commitments,
}: {
  commitments: KodaCommitment[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const visible = useMemo(
    () => commitments.filter((item) => item.status !== "resolved"),
    [commitments],
  );
  const mine = useMemo(
    () => visible.filter((item) => item.type === "OUTBOUND"),
    [visible],
  );
  const waitingOn = useMemo(
    () => visible.filter((item) => item.type === "INBOUND"),
    [visible],
  );
  const overdue = commitments.filter(
    (item) => item.deadline && new Date(item.deadline).getTime() < Date.now(),
  ).length;
  const dueThisWeek = commitments.filter((item) => {
    if (!item.deadline) return false;
    const time = new Date(item.deadline).getTime();
    return time >= Date.now() && time <= Date.now() + 7 * 24 * 60 * 60 * 1000;
  }).length;

  async function extract() {
    setBusy(true);
    setStatus(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/koda/commitments/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 16, timeZone }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        scanned?: number;
        extracted?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not extract commitments.");
      }
      setStatus(
        `Scanned ${payload.scanned ?? 0} emails and extracted ${payload.extracted ?? 0} commitments.`,
      );
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not extract commitments.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5 lg:h-full lg:min-h-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker text-[var(--color-accent)]">Commitments</p>
          <h1 className="display mt-1.5 text-2xl sm:text-3xl">Who owes what</h1>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => void extract()}
            disabled={busy}
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {busy ? "Extracting..." : "Extract from recent mail"}
          </button>
          {status && (
            <p className="text-[12px] text-[var(--color-text-soft)]">
              {status}
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[1fr_1fr_280px]">
        <Lane title="Promised by me" count={mine.length} countLabel="active">
          {mine.length === 0 ? (
            <EmptyLane kind="outbound" />
          ) : (
            mine.map((item) => <CommitmentCard key={item.id} item={item} />)
          )}
        </Lane>

        <Lane
          title="Waiting on others"
          count={waitingOn.length}
          countLabel="tracked"
        >
          {waitingOn.length === 0 ? (
            <EmptyLane kind="inbound" />
          ) : (
            waitingOn.map((item) => (
              <CommitmentCard key={item.id} item={item} />
            ))
          )}
        </Lane>

        <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="kicker">This week</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                [String(dueThisWeek), "due", "var(--color-text)"],
                [String(overdue), "overdue", "var(--color-danger)"],
                [String(commitments.length), "tracked", "var(--color-success)"],
              ].map(([n, label, color]) => (
                <div
                  key={label}
                  className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-2.5 text-center"
                >
                  <p
                    className="font-mono text-lg leading-none"
                    style={{ color }}
                  >
                    {n}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="kicker">Extraction</p>
            <ol className="mt-3 space-y-3">
              {[
                "KODA scans cached Gmail rows",
                "AI extracts owner, deadline, confidence, and source quote",
                "Stored commitments appear here and inside matching threads",
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--color-line-strong)] font-mono text-[9px] text-[var(--color-text-soft)]">
                    {index + 1}
                  </span>
                  <span className="text-[12px] leading-5 text-[var(--color-text-muted)]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
