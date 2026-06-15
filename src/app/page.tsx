import type { Metadata } from "next";
import Link from "next/link";

import { getSession } from "~/server/better-auth/server";

import { LandingNav } from "./_components/landing-nav";

export const metadata: Metadata = {
  title: "KODA | The execution layer for email and calendar",
  description:
    "KODA turns email commitments into tracked execution. Built around commitments, follow-through, and AI action orchestration on Gmail and Calendar.",
};

type IconName = "inbox" | "lanes" | "calendar" | "agent";

function Icon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
  };
  if (name === "inbox")
    return (
      <svg {...common}>
        <path d="M3 13l2.5-7A2 2 0 0 1 7.4 4.6h9.2a2 2 0 0 1 1.9 1.4L21 13" />
        <path d="M3 13h5l1.5 2.5h5L16 13h5v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    );
  if (name === "lanes")
    return (
      <svg {...common}>
        <rect x="3" y="4" width="7" height="16" rx="1.5" />
        <rect x="14" y="4" width="7" height="10" rx="1.5" />
      </svg>
    );
  if (name === "calendar")
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3M8 14h2M14 14h2" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4z" />
      <path d="M18 15l.8 2 .2.8.8.2-2 .8-.8 2-.8-2-2-.8 2-.2z" />
    </svg>
  );
}

const capabilities: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "inbox",
    title: "Commitment-aware inbox",
    body: "What you promised, what others owe you, and what is at risk of slipping — surfaced from live Gmail.",
  },
  {
    icon: "lanes",
    title: "Two-lane commitments",
    body: "Promised by me and Waiting on others. Owner, counterparty, deadline, confidence, next action.",
  },
  {
    icon: "calendar",
    title: "Planning calendar",
    body: "Real Google Calendar events with commitment deadlines overlaid. Create prep blocks from email context.",
  },
  {
    icon: "agent",
    title: "Execution agent",
    body: "Drafts replies, creates invites, schedules follow-ups, and answers from KODA's own commitment data.",
  },
];

const steps = [
  {
    title: "Connect Google",
    body: "Authorize Gmail and Calendar once. Corsair syncs your tenant into KODA's own operational tables.",
  },
  {
    title: "KODA extracts commitments",
    body: "Every thread is read for promises, requests, and deadlines — owner, counterparty, and confidence scored.",
  },
  {
    title: "Execute and follow through",
    body: "Draft replies, block prep time, schedule invites, and close the loop without leaving the workspace.",
  },
];

export default async function Home() {
  const session = await getSession();
  const primaryCta = session
    ? { href: "/inbox", label: "Continue to KODA" }
    : { href: "/login", label: "Connect Google" };

  return (
    <div className="min-h-screen">
      <LandingNav />

      <main className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* Hero */}
        <section className="relative isolate flex flex-col items-center pt-16 pb-16 text-center sm:pt-24 sm:pb-24">
          <div className="aurora" aria-hidden />
          <div className="grid-texture absolute inset-0 -z-10" aria-hidden />

          <span className="rise inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1 font-mono text-[11px] tracking-[0.08em] text-[var(--color-text-muted)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            Gmail + Calendar · via Corsair
          </span>

          <h1 className="rise display mt-6 max-w-3xl text-[2.5rem] leading-[1.05] sm:text-6xl">
            The execution layer for
            <br className="hidden sm:block" /> email and calendar.
          </h1>

          <p className="rise mt-5 max-w-xl text-[15px] leading-7 text-[var(--color-text-muted)] sm:text-base">
            Your inbox is not a feed. It is an operational system of promises,
            requests, and deadlines. KODA turns email commitments into tracked
            execution — replies, calendar blocks, and completed work.
          </p>

          <div className="rise mt-8 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            <Link
              href={primaryCta.href}
              className="btn-glow inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--color-accent)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              {primaryCta.label}
            </Link>
          </div>

          <p className="rise mt-6 font-mono text-[11px] tracking-[0.1em] text-[var(--color-text-soft)] uppercase">
            Self-hosted Corsair · tenant-scoped · no passwords stored
          </p>

          {/* Product preview */}
          <div className="rise relative mt-12 w-full sm:mt-16">
            <div className="float overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-danger)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-warning)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
                <span className="ml-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2.5 py-1 font-mono text-[11px] text-[var(--color-text-soft)]">
                  koda.dev/inbox
                </span>
              </div>

              <div className="grid min-h-[390px] grid-cols-1 text-left md:min-h-[440px] md:grid-cols-[1.7fr_2fr_1.5fr]">
                {/* MAIL pane */}
                <div className="flex flex-col border-b border-[var(--color-line)] md:border-r md:border-b-0">
                  <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-text)] uppercase">
                        Mail
                      </span>
                      <span className="font-mono text-[10px] text-[var(--color-text-soft)]">
                        15/20
                      </span>
                    </div>
                    <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-medium text-white">
                      Compose
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--color-line)]">
                    {[
                      {
                        initials: "KR",
                        from: "Krunetic",
                        time: "10:23",
                        subject: "Blind 75 DSA Sheet",
                        preview: "Please help me understand…",
                        tag: "NEEDS REPLY",
                        tone: "text-[var(--color-warning)] bg-[var(--color-warning-soft)]",
                        active: true,
                      },
                      {
                        initials: "UP",
                        from: "upGrad",
                        time: "4:06",
                        subject: "7 Months · IIIT-B + Microsoft",
                        preview: "Why you should join this…",
                        tag: "NEW",
                        tone: "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
                        active: false,
                      },
                      {
                        initials: "GJ",
                        from: "Glassdoor Jobs",
                        time: "1:01",
                        subject: "Software Engineer · AI Trainer",
                        preview: "Latest roles matched to you…",
                        tag: "OPEN",
                        tone: "text-[var(--color-text-soft)] bg-[var(--color-panel-strong)]",
                        active: false,
                      },
                    ].map((row) => (
                      <div
                        key={row.from}
                        className={`flex gap-3 border-l-2 px-3 py-2.5 ${
                          row.active
                            ? "border-l-transparent bg-[var(--color-panel-strong)]"
                            : "border-l-transparent"
                        }`}
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel-strong)] font-mono text-[11px] font-medium text-[var(--color-text-muted)]">
                          {row.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] font-medium text-[var(--color-text)]">
                              {row.from}
                            </p>
                            <span className="shrink-0 font-mono text-[10px] text-[var(--color-text-soft)]">
                              {row.time}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-muted)]">
                            {row.subject}
                          </p>
                          <span
                            className={`mt-1.5 inline-flex rounded-[var(--radius-sm)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] ${row.tone}`}
                          >
                            {row.tag}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* THREAD pane */}
                <div className="flex flex-col border-b border-[var(--color-line)] md:border-r md:border-b-0">
                  <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2.5">
                    <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-text)] uppercase">
                      Thread
                    </span>
                    <span className="font-mono text-[12px] text-[var(--color-text-soft)]">
                      —
                    </span>
                  </div>
                  <div className="px-4 py-3.5">
                    <h2 className="text-[15px] leading-snug font-medium tracking-tight text-[var(--color-text)]">
                      Re: Blind 75 DSA Sheet
                    </h2>
                    <p className="mt-1 text-[12px] text-[var(--color-text-soft)]">
                      Krunetic · to you · Jun 15, 10:23 AM
                    </p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-medium text-white">
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
                          <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
                        </svg>
                        Schedule
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)]">
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 1.5l1.4 3.4L12.8 6 9.4 7.4 8 10.8 6.6 7.4 3.2 6l3.4-1.1z" />
                        </svg>
                        Extract
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-[var(--color-line)] px-4 py-3">
                    <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)]">
                      <div className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-3 py-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-panel-strong)] font-mono text-[10px] font-medium text-[var(--color-text-muted)]">
                          KR
                        </span>
                        <p className="text-[13px] font-medium text-[var(--color-text)]">
                          Krunetic
                        </p>
                      </div>
                      <p className="px-3 py-2.5 text-[13px] leading-6 text-[var(--color-text-muted)]">
                        Please help me understand what is Blind 75 DSA Sheet.
                        Treat it as urgent.
                      </p>
                    </div>
                    <div className="mt-3 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] font-mono text-[9px] font-medium text-[var(--color-surface)]">
                          K
                        </span>
                        <span className="kicker">Reply</span>
                      </div>
                      <p className="mt-2.5 text-[13px] leading-6 text-[var(--color-text)]">
                        Happy to walk you through the Blind 75 — I&apos;ve
                        scheduled 30 minutes and sent an invite.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CALENDAR pane */}
                <div className="hidden flex-col md:flex">
                  <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-text)] uppercase">
                        Calendar
                      </span>
                      <span className="font-mono text-[10px] text-[var(--color-text-soft)]">
                        Jun
                      </span>
                    </div>
                    <span className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]">
                      + New
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 border-b border-[var(--color-line)] p-3">
                    {[
                      ["M", 15, true],
                      ["T", 16, false],
                      ["W", 17, false],
                      ["T", 18, false],
                      ["F", 19, false],
                      ["S", 20, false],
                      ["S", 21, false],
                    ].map(([label, date, today]) => (
                      <div
                        key={date as number}
                        className={`flex flex-col items-center gap-1 rounded-[var(--radius)] py-1.5 ${
                          today ? "bg-[var(--color-panel-strong)]" : ""
                        }`}
                      >
                        <span className="font-mono text-[10px] text-[var(--color-text-soft)]">
                          {label}
                        </span>
                        <span
                          className={`text-[12px] font-medium ${
                            today
                              ? "text-[var(--color-accent)]"
                              : "text-[var(--color-text)]"
                          }`}
                        >
                          {date}
                        </span>
                        <span className="h-1">
                          {(date === 15 || date === 19) && (
                            <span className="block h-1 w-1 rounded-full bg-[var(--color-accent)]" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3">
                    <p className="kicker mb-1.5 px-1">Up next</p>
                    <div className="space-y-0.5">
                      {[
                        ["Blind 75 discussion", "Wed · 2:00 PM"],
                        ["Hackathon work reminder", "Wed · 9:00 AM"],
                        ["Catch up", "Fri · 12:00 PM"],
                      ].map(([title, when]) => (
                        <div
                          key={title}
                          className="flex items-center gap-2.5 rounded-[var(--radius)] px-2 py-1.5"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] text-[var(--color-text)]">
                              {title}
                            </p>
                            <p className="font-mono text-[10px] text-[var(--color-text-soft)]">
                              {when}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="features" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker text-[var(--color-accent)]">Capabilities</p>
            <h2 className="display mt-3 text-3xl sm:text-4xl">
              Built for follow-through, not for feed-scrolling.
            </h2>
          </div>

          <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2">
            {capabilities.map((cap) => (
              <div
                key={cap.title}
                className="group rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5 transition hover:border-[var(--color-line-strong)] sm:p-6"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <Icon name={cap.icon} />
                </span>
                <p className="mt-4 text-[15px] font-medium text-[var(--color-text)]">
                  {cap.title}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
                  {cap.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker text-[var(--color-accent)]">How it works</p>
            <h2 className="display mt-3 text-3xl sm:text-4xl">
              From connected inbox to closed loop.
            </h2>
          </div>

          <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5 sm:p-6"
              >
                <span className="font-mono text-[12px] tracking-[0.1em] text-[var(--color-text-soft)]">
                  0{index + 1}
                </span>
                <p className="mt-3 text-[15px] font-medium text-[var(--color-text)]">
                  {step.title}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-16">
          <div className="relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="aurora" aria-hidden />
            <h2 className="display text-3xl sm:text-4xl">
              Stop re-reading your inbox.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-7 text-[var(--color-text-muted)]">
              {session
                ? "Jump back into KODA to schedule meetings from threads, draft replies, and keep calendar work moving."
                : "Connect Google and let KODA track every promise, deadline, and follow-up across mail and calendar."}
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
              <Link
                href={primaryCta.href}
                className="btn-glow inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--color-accent)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
              >
                {primaryCta.label}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-[var(--color-line)] py-6 text-[12px] text-[var(--color-text-soft)] sm:flex-row">
          <span className="font-mono">KODA · execution layer</span>
          <span>Self-hosted Corsair · tenant-scoped</span>
        </div>
      </footer>
    </div>
  );
}
