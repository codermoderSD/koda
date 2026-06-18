import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getOptionalSession } from "~/server/better-auth/server";

import { LandingNav } from "./_components/landing-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KODA | The execution layer for email and calendar",
  description:
    "Gmail and Google Calendar behind one command. Ask in plain language or by voice, KODA drafts replies, books and reschedules meetings, and tracks commitments in realtime.",
};

type IconName =
  | "agent"
  | "voice"
  | "inbox"
  | "calendar"
  | "alias"
  | "shield"
  | "commitments";

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
  if (name === "voice")
    return (
      <svg {...common}>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      </svg>
    );
  if (name === "calendar")
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3M8 14h2M14 14h2" />
      </svg>
    );
  if (name === "alias")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
      </svg>
    );
  if (name === "shield")
    return (
      <svg {...common}>
        <path d="M12 3l7 3v5c0 4.2-2.9 7.5-7 8.5-4.1-1-7-4.3-7-8.5V6z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  if (name === "commitments")
    return (
      <svg {...common}>
        <path d="M5 5.5h14M5 12h14M5 18.5h8" />
        <path d="m3 5.5.8.8L5.5 4.5M3 12l.8.8 1.7-1.8M3 18.5l.8.8 1.7-1.8" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4z" />
      <path d="M18 15l.8 2 .2.8.8.2-2 .8-.8 2-.8-2-2-.8 2-.2z" />
    </svg>
  );
}

const outcomes = [
  { value: "1", label: "workspace for Gmail and Calendar" },
  { value: "9", label: "AI tools over live Google data" },
  { value: "20", label: "daily KODA actions included" },
] as const;

const capabilities: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "agent",
    title: "One command for everything",
    body: "Search, draft, send, schedule, and reschedule across Gmail and Calendar from a single command bar.",
  },
  {
    icon: "voice",
    title: "Voice control",
    body: "Press the voice shortcut and say what needs to happen. KODA turns it into a draft, event, or search.",
  },
  {
    icon: "inbox",
    title: "Context-aware replies",
    body: "Replies are generated from the open thread, with the right recipient, subject, and conversation context.",
  },
  {
    icon: "calendar",
    title: "Scheduling in place",
    body: "Create events, move meetings, and find free slots while staying inside the inbox workflow.",
  },
  {
    icon: "commitments",
    title: "Commitment tracking",
    body: "KODA extracts promises, deadlines, owners, and source quotes so follow-ups do not disappear.",
  },
  {
    icon: "alias",
    title: "@alias shortcuts",
    body: "Name frequent contacts once. Type @cto or @client and KODA resolves it to the right address.",
  },
];

const workflows = [
  {
    title: "Triage the inbox",
    body: "Read a thread, find the next action, draft the reply, and send it without switching tools.",
  },
  {
    title: "Turn mail into meetings",
    body: "Ask for a time, create the Calendar event, and reply with the details from the same command.",
  },
  {
    title: "Track what is owed",
    body: "Extract commitments from mail and keep active, expired, and resolved items visible in one lane.",
  },
] as const;

const security = [
  "Google OAuth only, no password collection.",
  "Tenant-scoped Corsair storage for Google tokens.",
  "Gmail and Calendar access can be revoked from Google anytime.",
] as const;

const useCases = [
  "Founders coordinating hiring, sales, and investor follow-ups.",
  "Students and builders managing deadlines, interviews, and mentors.",
  "Operators who live between email, calendar, and reminders.",
  "Anyone who wants an assistant that acts instead of only summarizing.",
] as const;

export default async function Home() {
  const session = await getOptionalSession();
  const primaryCta = session
    ? { href: "/inbox", label: "Continue to KODA" }
    : { href: "/login", label: "Connect Google" };

  return (
    <div className="min-h-screen">
      <LandingNav />

      <main className="relative isolate">
        <section className="relative isolate min-h-[calc(100vh-56px)] overflow-hidden px-5 py-14 sm:px-6 sm:py-18">
          <Image
            src="/hero.png"
            alt="KODA workspace showing Gmail, thread actions, and Calendar side by side"
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-20 object-cover object-[58%_18%] opacity-[0.46]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--color-surface)_0%,rgb(10_11_13_/_0.9)_32%,rgb(10_11_13_/_0.58)_62%,rgb(10_11_13_/_0.72)_100%)]" />
          <div className="grid-texture absolute inset-0 -z-10" aria-hidden />

          <div className="mx-auto flex min-h-[calc(100vh-168px)] max-w-6xl flex-col justify-center">
            <div className="max-w-2xl">
              <span className="rise inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_72%,transparent)] px-3 py-1 font-mono text-[11px] tracking-[0.08em] text-[var(--color-text-muted)] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                Gmail + Calendar
              </span>

              <h1 className="rise display mt-6 max-w-2xl text-[2.65rem] leading-[1.02] sm:text-6xl">
                The execution layer for email and calendar.
              </h1>

              <p className="rise mt-5 max-w-xl text-[15px] leading-7 text-[var(--color-text-muted)] sm:text-base">
                Ask in plain language, or just speak. KODA drafts replies, books
                meetings, reschedules events, and tracks commitments across
                Gmail and Google Calendar.
              </p>

              <div className="rise mt-8 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                <Link
                  href={primaryCta.href}
                  className="btn-glow inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--color-accent-strong)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-emerald-600"
                >
                  {primaryCta.label}
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center rounded-[var(--radius)] border border-[var(--color-line-strong)] bg-[color-mix(in_oklab,var(--color-surface)_62%,transparent)] px-5 py-2.5 text-[14px] font-medium text-[var(--color-text)] backdrop-blur transition hover:bg-[var(--color-panel-strong)]"
                >
                  See features
                </Link>
              </div>

              <div className="rise mt-10 grid max-w-xl grid-cols-3 gap-3">
                {outcomes.map((item) => (
                  <div
                    key={item.label}
                    className="border-l border-[var(--color-line-strong)] pl-3"
                  >
                    <p className="font-mono text-[18px] text-[var(--color-text)]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-soft)]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-2)_70%,transparent)]">
          <div className="mx-auto grid max-w-6xl gap-4 px-5 py-6 sm:grid-cols-3 sm:px-6">
            {[
              "Drafts from thread context",
              "Calendar actions in the inbox",
              "Follow-ups tracked automatically",
            ].map((item) => (
              <p
                key={item}
                className="font-mono text-[11px] tracking-[0.08em] text-[var(--color-text-soft)] uppercase"
              >
                {item}
              </p>
            ))}
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-6 sm:py-24"
        >
          <div className="max-w-2xl">
            <p className="kicker text-[var(--color-accent)]">Capabilities</p>
            <h2 className="display mt-3 text-3xl sm:text-4xl">
              One command across mail, meetings, and promises.
            </h2>
            <p className="mt-4 text-[14px] leading-7 text-[var(--color-text-muted)]">
              KODA is not a separate chatbot. It sits inside the workspace where
              the work already happens and calls real tools against your data.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
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

        <section
          id="workflows"
          className="border-y border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-2)_55%,transparent)]"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="kicker text-[var(--color-accent)]">Workflows</p>
              <h2 className="display mt-3 text-3xl sm:text-4xl">
                Built for repeated daily execution.
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-[var(--color-text-muted)]">
                The interface stays dense and operational: inbox, thread,
                calendar, drafts, and commitments are always close together.
              </p>
            </div>

            <div className="space-y-3">
              {workflows.map((workflow, index) => (
                <div
                  key={workflow.title}
                  className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:grid-cols-[auto_1fr] sm:p-6"
                >
                  <span className="font-mono text-[12px] tracking-[0.1em] text-[var(--color-text-soft)]">
                    0{index + 1}
                  </span>
                  <div>
                    <p className="text-[15px] font-medium text-[var(--color-text)]">
                      {workflow.title}
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
                      {workflow.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="security"
          className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center"
        >
          <div>
            <p className="kicker text-[var(--color-accent)]">Access</p>
            <h2 className="display mt-3 text-3xl sm:text-4xl">
              Google permissions once, then normal login after that.
            </h2>
            <p className="mt-4 text-[14px] leading-7 text-[var(--color-text-muted)]">
              First-time users approve Gmail and Calendar scopes. Returning
              users sign in with the existing Google grant instead of seeing the
              permission screen again.
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <Icon name="shield" />
              </span>
              <p className="text-[15px] font-medium text-[var(--color-text)]">
                Scoped Google access
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {security.map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <p className="text-[13px] leading-6 text-[var(--color-text-muted)]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="use-cases"
          className="border-y border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-2)_55%,transparent)]"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="kicker text-[var(--color-accent)]">Use cases</p>
              <h2 className="display mt-3 text-3xl sm:text-4xl">
                For people who cannot afford to lose the next action.
              </h2>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {useCases.map((item) => (
                <div
                  key={item}
                  className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-[14px] leading-7 text-[var(--color-text-muted)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
          <div className="relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="aurora" aria-hidden />
            <h2 className="display text-3xl sm:text-4xl">
              Stop living in two tabs.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-7 text-[var(--color-text-muted)]">
              {session
                ? "Jump back into KODA, draft a reply, book or move a meeting, or ask what you're waiting on."
                : "Connect Google and run your mail and calendar from one command, by keyboard or by voice."}
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
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-line)] py-6 text-[12px] text-[var(--color-text-soft)] sm:flex-row">
          <span className="font-mono">KODA · execution layer</span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link
              href="/privacy"
              className="transition hover:text-[var(--color-text)]"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition hover:text-[var(--color-text)]"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
