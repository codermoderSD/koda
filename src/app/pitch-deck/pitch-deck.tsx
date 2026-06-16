"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { KodaLogo } from "../_components/koda-logo";
import { ThemeToggle } from "../_components/theme-toggle";

type IllustrationName =
  | "ai-data-extraction"
  | "charts"
  | "comment-sent"
  | "content-team"
  | "morning-plans"
  | "online-meetings"
  | "tech-keynote"
  | "to-do-app";

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  stat?: { value: string; label: string };
  illustration: IllustrationName;
};

const slides: Slide[] = [
  {
    eyebrow: "01 / Title",
    title: "KODA",
    body: "The execution layer for email and calendar. KODA turns Gmail and Google Calendar into an AI workspace for commitments, follow-ups, drafts, scheduling, and operational follow-through.",
    bullets: ["Gmail", "Google Calendar", "AI execution", "Commitments"],
    stat: {
      value: "1",
      label: "workspace for mail, calendar, and follow-through",
    },
    illustration: "tech-keynote",
  },
  {
    eyebrow: "02 / Problem",
    title: "Important work starts in email but rarely ends there.",
    body: "People make promises, ask for decisions, suggest meetings, and defer follow-ups inside threads. Gmail stores the conversation and Calendar stores time, but neither reliably tracks what must happen next.",
    bullets: [
      "Promises get buried in long threads.",
      "Follow-ups depend on memory.",
      "Calendar work is disconnected from email context.",
    ],
    stat: {
      value: "lost",
      label: "context between messages, meetings, and deadlines",
    },
    illustration: "comment-sent",
  },
  {
    eyebrow: "03 / Solution",
    title: "KODA turns communication into execution.",
    body: "KODA connects Gmail and Google Calendar into one AI workspace that extracts commitments, drafts replies, schedules meetings, creates calendar blocks, and keeps follow-through visible.",
    bullets: [
      "Find what matters across live Gmail and Calendar data.",
      "Track commitments by owner, counterparty, deadline, and status.",
      "Act through drafts, events, follow-ups, and AI commands.",
    ],
    stat: { value: "AI", label: "that does work across email and calendar" },
    illustration: "ai-data-extraction",
  },
  {
    eyebrow: "04 / Product",
    title: "Inbox, calendar, commitments, and command bar.",
    body: "KODA is organized around the real work surface: email threads, calendar time, extracted commitments, and an execution command bar that can search, draft, schedule, and act.",
    bullets: [
      "Inbox with thread-aware AI actions.",
      "Calendar with event search and scheduling workflows.",
      "Commitments split into promised by me and waiting on others.",
    ],
    stat: { value: "4", label: "core surfaces connected by one workflow" },
    illustration: "to-do-app",
  },
  {
    eyebrow: "05 / Architecture",
    title: "A workflow-specific data layer for follow-through.",
    body: "KODA syncs Gmail and Calendar through Corsair, stores normalized operational data in Postgres, and exposes AI tools over that structured workspace state.",
    bullets: [
      "Acquisition: Gmail, Calendar, OAuth, and webhooks.",
      "Operational data: email, calendar, commitments, settings, and usage.",
      "Execution: AI tools that draft, search, schedule, and update state.",
    ],
    stat: { value: "Postgres", label: "as the operational memory layer" },
    illustration: "charts",
  },
  {
    eyebrow: "06 / Market",
    title: "Built for relationship-driven work.",
    body: "KODA targets users whose output depends on external communication, fast follow-up, and accurate scheduling across many active threads.",
    bullets: [
      "Founders, operators, recruiters, and executive assistants.",
      "Sales, partnerships, account management, and customer success teams.",
      "Consultants, legal teams, and finance teams managing client threads.",
    ],
    stat: {
      value: "B2B",
      label: "workflows where missed follow-ups cost money",
    },
    illustration: "online-meetings",
  },
  {
    eyebrow: "07 / Go-to-market",
    title:
      "Start with high-urgency individual workflows, then expand to teams.",
    body: "KODA can enter through founders, operators, recruiters, and assistants who feel follow-up pain immediately, then grow into shared team workspaces once commitments become collaborative.",
    bullets: [
      "Launch with Google Workspace users who already live in Gmail and Calendar.",
      "Use review-ready demos, founder-led onboarding, and workflow templates.",
      "Expand from personal execution to delegated team ownership.",
    ],
    stat: { value: "land", label: "with individuals, expand through teams" },
    illustration: "content-team",
  },
  {
    eyebrow: "08 / Roadmap",
    title: "From personal execution to team operating layer.",
    body: "The next step is shared execution: teams, delegated ownership, SLAs, proactive reminders, meeting preparation, and integrations with the systems where work lands.",
    bullets: [
      "Team workspaces and shared commitments.",
      "Slack, Notion, Linear, GitHub, and CRM integrations.",
      "Admin analytics and AI reliability evals.",
    ],
    stat: { value: "next", label: "shared commitments and team execution" },
    illustration: "morning-plans",
  },
];

const illustrationAssets: Record<
  IllustrationName,
  { alt: string; src: string }
> = {
  "ai-data-extraction": {
    alt: "AI data extraction workflow illustration",
    src: "/pitch-deck/ai-data-extraction.svg",
  },
  charts: {
    alt: "Analytics charts illustration",
    src: "/pitch-deck/charts.svg",
  },
  "comment-sent": {
    alt: "Message sent illustration",
    src: "/pitch-deck/comment-sent.svg",
  },
  "content-team": {
    alt: "Team collaboration illustration",
    src: "/pitch-deck/content-team.svg",
  },
  "morning-plans": {
    alt: "Planning roadmap illustration",
    src: "/pitch-deck/morning-plans.svg",
  },
  "online-meetings": {
    alt: "Online meetings illustration",
    src: "/pitch-deck/online-meetings.svg",
  },
  "tech-keynote": {
    alt: "Technology presentation illustration",
    src: "/pitch-deck/tech-keynote.svg",
  },
  "to-do-app": {
    alt: "To-do app illustration",
    src: "/pitch-deck/to-do-app.svg",
  },
};

function clampSlide(index: number) {
  return Math.max(0, Math.min(slides.length - 1, index));
}

export function PitchDeck() {
  const [active, setActive] = useState(0);
  const slide = slides[active]!;

  const goTo = useCallback((index: number) => setActive(clampSlide(index)), []);
  const previous = useCallback(
    () => setActive((index) => clampSlide(index - 1)),
    [],
  );
  const next = useCallback(
    () => setActive((index) => clampSlide(index + 1)),
    [],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        next();
      }
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(slides.length - 1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, next, previous]);

  const progress = useMemo(
    () => `${Math.round(((active + 1) / slides.length) * 100)}%`,
    [active],
  );

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-5 py-5 sm:px-6">
      <div className="aurora" aria-hidden />
      <div className="grid-texture absolute inset-0 -z-10" aria-hidden />

      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <KodaLogo showWordmark />
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[11px] tracking-[0.12em] text-[var(--color-text-soft)] uppercase sm:inline">
            {active + 1} / {slides.length}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-104px)] max-w-7xl flex-col justify-center py-6">
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-2)_84%,transparent)] shadow-[var(--shadow-soft)]">
          <div
            className="h-1 bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: progress }}
          />

          <div className="grid min-h-[min(760px,calc(100vh-168px))] items-center gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <div className="relative z-10">
              <p className="kicker text-[var(--color-accent)]">
                {slide.eyebrow}
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl leading-[1.04] font-medium text-[var(--color-text)] sm:text-6xl">
                {slide.title}
              </h1>
              <p className="mt-6 max-w-2xl text-[16px] leading-8 text-[var(--color-text-muted)] sm:text-lg">
                {slide.body}
              </p>

              <div className="mt-8 grid gap-3">
                {slide.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3.5 py-3 text-[14px] leading-6 text-[var(--color-text-muted)]"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <PitchIllustration name={slide.illustration} />
              {slide.stat && (
                <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
                  <p className="text-3xl font-medium text-[var(--color-text)]">
                    {slide.stat.value}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-[var(--color-text-muted)]">
                    {slide.stat.label}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-[var(--color-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-1.5">
              {slides.map((item, index) => (
                <button
                  key={item.eyebrow}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    index === active
                      ? "w-8 bg-[var(--color-accent)]"
                      : "w-2 bg-[var(--color-line-strong)] hover:bg-[var(--color-text-soft)]"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={previous}
                disabled={active === 0}
                className="tap inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-text)] transition hover:bg-[var(--color-panel-strong)] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous slide"
              >
                <ArrowIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={next}
                disabled={active === slides.length - 1}
                className="tap inline-flex h-10 items-center gap-2 rounded-[var(--radius)] bg-[var(--color-accent)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
                <ArrowIcon direction="right" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="M12 4 6 10l6 6M7 10h8" />
      ) : (
        <path d="m8 4 6 6-6 6M13 10H5" />
      )}
    </svg>
  );
}

function PitchIllustration({ name }: { name: IllustrationName }) {
  const asset = illustrationAssets[name];

  return (
    <IllustrationFrame>
      <Image
        src={asset.src}
        alt={asset.alt}
        width={900}
        height={680}
        priority={name === "tech-keynote"}
        className="mx-auto h-[min(42vh,360px)] w-full object-contain"
      />
    </IllustrationFrame>
  );
}

function IllustrationFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_88%,transparent)] p-4 shadow-[var(--shadow-soft)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,color-mix(in_oklab,var(--color-accent)_22%,transparent),transparent_34%),radial-gradient(circle_at_88%_78%,color-mix(in_oklab,var(--color-warning)_14%,transparent),transparent_40%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}
