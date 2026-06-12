import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "./_components/theme-toggle";

export const metadata: Metadata = {
  title: "KODA | The execution layer for email and calendar",
  description:
    "KODA turns email commitments into tracked execution. Built around commitments, follow-through, and AI action orchestration on Gmail and Calendar.",
};

const capabilities = [
  [
    "Commitment-aware inbox",
    "What you promised, what others owe you, and what is at risk of slipping — surfaced from live Gmail.",
  ],
  [
    "Two-lane commitments",
    "Promised by me and Waiting on others. Owner, counterparty, deadline, confidence, next action.",
  ],
  [
    "Planning calendar",
    "Real Google Calendar events with commitment deadlines overlaid. Create prep blocks from email context.",
  ],
  [
    "Execution agent",
    "Drafts replies, creates invites, schedules follow-ups, and answers from KODA's own commitment data.",
  ],
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-5 sm:px-6">
      {/* Nav */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] font-mono text-[13px] font-medium text-[var(--color-surface)]">
            K
          </span>
          <span className="text-[15px] font-medium tracking-tight">KODA</span>
        </div>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/inbox"
            className="rounded-[var(--radius)] px-3 py-1.5 text-[13px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
          >
            Workspace
          </Link>
          <Link
            href="/login"
            className="rounded-[var(--radius)] bg-[var(--color-text)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--color-surface)] transition hover:opacity-90"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center pt-20 pb-14 text-center sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1 font-mono text-[11px] tracking-[0.08em] text-[var(--color-text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          Gmail + Calendar · via Corsair
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-medium tracking-tight text-[var(--color-text)] sm:text-6xl">
          The execution layer for
          <br />
          email and calendar.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-[var(--color-text-muted)]">
          Your inbox is not a feed. It is an operational system of promises,
          requests, and deadlines. KODA turns email commitments into tracked
          execution — replies, calendar blocks, and completed work.
        </p>
        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
          >
            Connect Google
          </Link>
          <Link
            href="/inbox"
            className="inline-flex items-center justify-center rounded-[var(--radius)] border border-[var(--color-line-strong)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-text)] transition hover:bg-[var(--color-panel)]"
          >
            Open product preview →
          </Link>
        </div>
      </section>

      {/* Product preview */}
      <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-danger)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-warning)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
          <span className="ml-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2.5 py-1 font-mono text-[11px] text-[var(--color-text-soft)]">
            koda.dev/inbox
          </span>
        </div>

        <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[200px_1fr_220px]">
          {/* mini sidebar */}
          <div className="hidden border-r border-[var(--color-line)] p-3 md:block">
            {["Inbox", "Commitments", "Calendar", "Agent"].map((item, i) => (
              <div
                key={item}
                className={`flex items-center gap-2 rounded-[var(--radius)] px-2.5 py-2 text-[13px] ${
                  i === 0
                    ? "bg-[var(--color-panel-strong)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                <span className="font-mono text-[10px] text-[var(--color-text-soft)]">
                  0{i + 1}
                </span>
                {item}
              </div>
            ))}
          </div>

          {/* reading pane */}
          <div className="border-r border-[var(--color-line)] p-5">
            <p className="text-[13px] text-[var(--color-text-soft)]">Priya Shah</p>
            <h2 className="mt-1 text-lg font-medium tracking-tight text-[var(--color-text)]">
              Q3 pricing breakdown
            </h2>
            <div className="mt-4 space-y-3 text-[13px] leading-7 text-[var(--color-text-muted)]">
              <p>Hi Shubham,</p>
              <p>
                Can you send the pricing sheet before tomorrow&apos;s review? We
                should block a short prep slot so the numbers are ready.
              </p>
              <p className="text-[var(--color-text)]">Priya</p>
            </div>
          </div>

          {/* commitment rail */}
          <div className="space-y-3 p-4">
            <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
              <p className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-accent)] uppercase">
                Commitment
              </p>
              <p className="mt-2 text-[13px] font-medium leading-5 text-[var(--color-text)]">
                Send pricing breakdown before review
              </p>
              <p className="mt-2 font-mono text-[10px] text-[var(--color-warning)]">
                DUE TOMORROW 9:00
              </p>
            </div>
            <div className="rounded-[var(--radius)] border border-[var(--color-line)] px-3 py-2 text-[13px] text-[var(--color-text-muted)]">
              Draft reply →
            </div>
            <div className="rounded-[var(--radius)] border border-[var(--color-line)] px-3 py-2 text-[13px] text-[var(--color-text-muted)]">
              Add calendar block →
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2">
        {capabilities.map(([title, body]) => (
          <div key={title} className="bg-[var(--color-surface-2)] p-5 sm:p-6">
            <p className="text-[14px] font-medium text-[var(--color-text)]">
              {title}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
              {body}
            </p>
          </div>
        ))}
      </section>

      <footer className="mt-8 flex items-center justify-between border-t border-[var(--color-line)] pt-5 pb-2 text-[12px] text-[var(--color-text-soft)]">
        <span className="font-mono">KODA · execution layer</span>
        <span>Self-hosted Corsair · tenant-scoped</span>
      </footer>
    </main>
  );
}
