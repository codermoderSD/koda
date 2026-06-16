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

/** A headline is a list of segments; `hl` paints the segment in the accent. */
type Seg = { t: string; hl?: boolean };

type Item = { title: string; body?: string };

type Slide =
  | {
      layout: "title";
      kicker: string;
      brand: string;
      headline: Seg[];
      sub: string;
      presenter: string;
      illustration: IllustrationName;
    }
  | { layout: "statement"; kicker: string; headline: Seg[]; sub: string }
  | {
      layout: "flow";
      kicker: string;
      headline: Seg[];
      steps: string[];
      footnote?: string;
    }
  | {
      layout: "grid";
      kicker: string;
      headline: Seg[];
      items: Item[];
      footnote?: Seg[];
    }
  | {
      layout: "circles";
      kicker: string;
      headline: Seg[];
      items: Item[];
      footnote?: Seg[];
    }
  | {
      layout: "split";
      kicker: string;
      headline: Seg[];
      bullets: string[];
      illustration: IllustrationName;
    }
  | {
      layout: "closing";
      kicker: string;
      headline: Seg[];
      sub: string;
      cta: string;
    };

const slides: Slide[] = [
  {
    layout: "title",
    kicker: "Pitch · 2026",
    brand: "KODA",
    headline: [
      { t: "the " },
      { t: "execution layer", hl: true },
      { t: " for " },
      { t: "email", hl: true },
      { t: " and " },
      { t: "calendar", hl: true },
    ],
    sub: "Turn email commitments into tracked execution — replies, calendar blocks, and completed work.",
    presenter: "Shubham Dalvi",
    illustration: "online-meetings",
  },
  {
    layout: "statement",
    kicker: "The problem",
    headline: [
      { t: "work starts in " },
      { t: "email", hl: true },
      { t: " but rarely " },
      { t: "ends there", hl: true },
    ],
    sub: "Promises, decisions, and follow-ups get made inside threads — then live or die by memory.",
  },
  {
    layout: "flow",
    kicker: "Where it breaks",
    headline: [{ t: "every promise becomes a " }, { t: "loose end", hl: true }],
    steps: [
      "promise made",
      "thread buried",
      "follow-up forgotten",
      "deadline missed",
      "trust lost",
    ],
    footnote:
      "Gmail stores the conversation. Calendar stores time. Neither tracks what happens next.",
  },
  {
    layout: "statement",
    kicker: "The cost",
    headline: [
      { t: "missed follow-ups cost " },
      { t: "revenue", hl: true },
      { t: ", " },
      { t: "time", hl: true },
      { t: ", and " },
      { t: "trust", hl: true },
    ],
    sub: "The work that slips is usually the work that mattered most.",
  },
  {
    layout: "statement",
    kicker: "Why now",
    headline: [{ t: "ai can finally " }, { t: "read communication", hl: true }],
    sub: "But most email AI stops at summaries and drafts. The loop between a promise and its follow-through is still wide open.",
  },
  {
    layout: "statement",
    kicker: "The solution",
    headline: [
      { t: "koda turns communication into " },
      { t: "execution", hl: true },
    ],
    sub: "One AI workspace over live Gmail and Google Calendar — extract commitments, draft replies, schedule meetings, and close the loop.",
  },
  {
    layout: "flow",
    kicker: "How it works",
    headline: [
      { t: "from connected inbox to " },
      { t: "closed loop", hl: true },
    ],
    steps: [
      "connect google",
      "extract commitments",
      "schedule next action",
      "send the reply",
      "close the loop",
    ],
  },
  {
    layout: "grid",
    kicker: "The product",
    headline: [{ t: "four surfaces, " }, { t: "one loop", hl: true }],
    items: [
      {
        title: "inbox",
        body: "Live Gmail threads with thread-aware AI actions.",
      },
      {
        title: "commitments",
        body: "Promised by me and waiting on others, scored by deadline and confidence.",
      },
      {
        title: "calendar",
        body: "Google Calendar with deadlines overlaid and prep blocks built from threads.",
      },
      {
        title: "agent",
        body: "Drafts replies, creates invites, and answers from KODA's own data.",
      },
    ],
    footnote: [
      { t: "one " },
      { t: "workspace", hl: true },
      { t: ", not four tabs." },
    ],
  },
  {
    layout: "split",
    kicker: "The wedge",
    headline: [
      { t: "a " },
      { t: "commitment-aware", hl: true },
      { t: " inbox and calendar" },
    ],
    bullets: [
      "what I promised",
      "what others owe me",
      "what needs a reply",
      "what's at risk of slipping",
    ],
    illustration: "to-do-app",
  },
  {
    layout: "grid",
    kicker: "Why different",
    headline: [{ t: "we optimize for " }, { t: "follow-through", hl: true }],
    items: [
      {
        title: "faster replies",
        body: "Context and drafts ready inside the thread.",
      },
      {
        title: "nothing slips",
        body: "Every commitment tracked through to done.",
      },
      {
        title: "less mental load",
        body: "Stop re-reading the inbox just to remember.",
      },
      {
        title: "compounding memory",
        body: "Tenant-scoped operational state that grows.",
      },
    ],
    footnote: [
      { t: "follow-through, " },
      { t: "not", hl: true },
      { t: " faster drafting." },
    ],
  },
  {
    layout: "circles",
    kicker: "Architecture",
    headline: [
      { t: "a data layer built for " },
      { t: "follow-through", hl: true },
    ],
    items: [
      { title: "acquisition", body: "Gmail, Calendar & webhooks via Corsair" },
      { title: "operational data", body: "Normalized state in Postgres" },
      { title: "decision", body: "Classification, extraction & priority" },
      { title: "execution", body: "AI tools that act and update state" },
    ],
    footnote: [
      { t: "model-flexible " },
      { t: "by design", hl: true },
      { t: "." },
    ],
  },
  {
    layout: "grid",
    kicker: "Market",
    headline: [
      { t: "built for " },
      { t: "relationship-driven work", hl: true },
    ],
    items: [
      { title: "founders & operators" },
      { title: "sales & partnerships" },
      { title: "recruiters & assistants" },
      { title: "consultants, legal & finance" },
    ],
    footnote: [
      { t: "b2b workflows where missed follow-ups " },
      { t: "cost money", hl: true },
      { t: "." },
    ],
  },
  {
    layout: "grid",
    kicker: "Traction",
    headline: [
      { t: "a " },
      { t: "live prototype", hl: true },
      { t: ", already executing" },
    ],
    items: [
      { title: "google sign-in & gmail sync" },
      { title: "calendar search & actions" },
      { title: "ai agent & reply drafting" },
      { title: "commitment extraction & ai quota" },
    ],
    footnote: [{ t: "deployed at " }, { t: "koda.shubhamdalvi.in", hl: true }],
  },
  {
    layout: "circles",
    kicker: "What's coming",
    headline: [
      { t: "from personal execution to " },
      { t: "team operating layer", hl: true },
    ],
    items: [
      { title: "team workspaces", body: "Shared commitments & ownership" },
      { title: "integrations", body: "Slack, Notion, Linear, GitHub, CRM" },
      { title: "proactive", body: "Reminders & meeting prep" },
      { title: "analytics", body: "Execution health & AI evals" },
    ],
    footnote: [
      { t: "execution " },
      { t: "compounds", hl: true },
      { t: " over time." },
    ],
  },
  {
    layout: "closing",
    kicker: "The ask",
    headline: [{ t: "help us " }, { t: "close the loop", hl: true }],
    sub: "Looking for feedback, product validation, and design partners to turn the prototype into the operating layer for relationship-driven work.",
    cta: "koda.shubhamdalvi.in",
  },
];

const illustrationAssets: Record<
  IllustrationName,
  { alt: string; src: string }
> = {
  "ai-data-extraction": {
    alt: "AI data extraction illustration",
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
    alt: "Planning illustration",
    src: "/pitch-deck/morning-plans.svg",
  },
  "online-meetings": {
    alt: "Online meetings illustration",
    src: "/pitch-deck/online-meetings.svg",
  },
  "tech-keynote": {
    alt: "Keynote illustration",
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

/** Mixed-weight headline: accent segments inherit the accent color. */
function Headline({
  parts,
  className = "",
}: {
  parts: Seg[];
  className?: string;
}) {
  return (
    <h1
      className={`max-w-full text-[length:var(--h)] leading-[1.04] font-medium tracking-[-0.03em] break-words hyphens-none text-[var(--color-text)] lowercase [--h:clamp(1.9rem,6vw,5rem)] ${className}`}
    >
      {parts.map((p, i) => (
        <span
          key={i}
          className={p.hl ? "text-[var(--color-accent)]" : undefined}
        >
          {p.t}
        </span>
      ))}
    </h1>
  );
}

function Footnote({ parts }: { parts: Seg[] }) {
  return (
    <p className="text-xl leading-snug font-medium tracking-[-0.02em] text-[var(--color-text-soft)] lowercase sm:text-3xl">
      {parts.map((p, i) => (
        <span
          key={i}
          className={p.hl ? "text-[var(--color-accent)]" : undefined}
        >
          {p.t}
        </span>
      ))}
    </p>
  );
}

export function PitchDeck() {
  const [active, setActive] = useState(0);
  const slide = slides[active]!;

  const goTo = useCallback((index: number) => setActive(clampSlide(index)), []);
  const previous = useCallback(() => setActive((i) => clampSlide(i - 1)), []);
  const next = useCallback(() => setActive((i) => clampSlide(i + 1)), []);

  // Deep-link each slide via the URL hash (#3 → slide 3). Shareable + resumable.
  useEffect(() => {
    const fromHash = Number(window.location.hash.replace("#", ""));
    if (Number.isFinite(fromHash) && fromHash >= 1)
      setActive(clampSlide(fromHash - 1));
  }, []);

  useEffect(() => {
    const hash = `#${active + 1}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [active]);

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
    () => `${((active + 1) / slides.length) * 100}%`,
    [active],
  );
  const isTitle = slide.layout === "title";
  const atStart = active === 0;
  const atEnd = active === slides.length - 1;

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[var(--color-surface)] px-6 py-7 sm:px-12 sm:py-9 lg:px-20">
      <div className="aurora" aria-hidden />
      <div className="grid-texture absolute inset-0 -z-10" aria-hidden />

      {/* hairline progress */}
      <div className="absolute inset-x-0 top-0 h-px bg-[var(--color-line)]">
        <div
          className="h-px bg-[var(--color-accent)] transition-all duration-500"
          style={{ width: progress }}
        />
      </div>

      {/* top chrome: kicker / logo + nav */}
      <header className="flex items-start justify-between gap-4">
        {isTitle ? (
          <KodaLogo markClassName="h-8 w-8" />
        ) : (
          <p className="kicker text-[11px] text-[var(--color-text-soft)]">
            {slide.kicker}
          </p>
        )}

        <div className="flex items-center gap-2">
          {isTitle && (
            <span className="hidden rounded-full border border-[var(--color-line-strong)] px-3 py-1 font-mono text-[11px] tracking-[0.1em] text-[var(--color-text-muted)] sm:inline">
              {slide.kicker}
            </span>
          )}
          <button
            type="button"
            onClick={previous}
            disabled={atStart}
            aria-label="Previous slide"
            className="tap inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line-strong)] text-[var(--color-text)] transition hover:bg-[var(--color-panel)] disabled:pointer-events-none disabled:opacity-25"
          >
            <Arrow direction="left" />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={atEnd}
            aria-label="Next slide"
            className="tap inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-30"
          >
            <Arrow direction="right" />
          </button>
        </div>
      </header>

      {/* stage */}
      <section className="flex flex-1 items-center py-10">
        <div key={active} className="pop w-full">
          {slide.layout === "title" && <TitleSlide slide={slide} />}
          {slide.layout === "statement" && <StatementSlide slide={slide} />}
          {slide.layout === "flow" && <FlowSlide slide={slide} />}
          {slide.layout === "grid" && <GridSlide slide={slide} />}
          {slide.layout === "circles" && <CirclesSlide slide={slide} />}
          {slide.layout === "split" && <SplitSlide slide={slide} />}
          {slide.layout === "closing" && <ClosingSlide slide={slide} />}
        </div>
      </section>

      {/* bottom chrome: domain + theme + page */}
      <footer className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] tracking-[0.04em] text-[var(--color-text-soft)]">
            koda.shubhamdalvi.in
          </span>
          <ThemeToggle />
        </div>
        <span className="font-mono text-[12px] tracking-[0.08em] text-[var(--color-text-soft)] tabular-nums">
          {String(active + 1).padStart(2, "0")} /{" "}
          {String(slides.length).padStart(2, "0")}
        </span>
      </footer>
    </main>
  );
}

/* ───────────────────────── layouts ───────────────────────── */

function TitleSlide({ slide }: { slide: Extract<Slide, { layout: "title" }> }) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="font text-[clamp(1.25rem,2vw,2rem)] leading-none tracking-[-0.04em] text-[var(--color-text)]">
          {slide.brand}
        </p>
        <Headline
          parts={slide.headline}
          className="mt-5 max-w-3xl [--h:clamp(1.5rem,4.6vw,2.9rem)]"
        />
        <p className="mt-7 max-w-xl text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">
          {slide.sub}
        </p>
        <div className="mt-12">
          <p className="kicker text-[var(--color-text-soft)]">Presented by</p>
          <p className="mt-1.5 text-lg text-[var(--color-text)]">
            {slide.presenter}
          </p>
        </div>
      </div>
      <div className="hidden lg:block">
        <FlatIllustration name={slide.illustration} />
      </div>
    </div>
  );
}

function StatementSlide({
  slide,
}: {
  slide: Extract<Slide, { layout: "statement" }>;
}) {
  return (
    <div className="max-w-5xl">
      <Headline parts={slide.headline} />
      <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--color-text-muted)] sm:text-xl">
        {slide.sub}
      </p>
    </div>
  );
}

function FlowSlide({ slide }: { slide: Extract<Slide, { layout: "flow" }> }) {
  return (
    <div>
      <Headline
        parts={slide.headline}
        className="max-w-4xl [--h:clamp(1.9rem,5vw,3.6rem)]"
      />
      <div className="mt-12 flex flex-col items-stretch gap-3 sm:flex-row sm:items-stretch sm:gap-2">
        {slide.steps.map((step, i) => (
          <div key={step} className="contents">
            <div className="flex min-h-[64px] flex-1 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-strong)] px-4 py-5 text-center text-[15px] leading-snug text-[var(--color-text-muted)] sm:min-h-[128px]">
              {step}
            </div>
            {i < slide.steps.length - 1 && (
              <span className="flex shrink-0 rotate-90 items-center justify-center self-center text-[var(--color-accent)] sm:rotate-0">
                <Arrow direction="right" />
              </span>
            )}
          </div>
        ))}
      </div>
      {slide.footnote && (
        <p className="mt-12 max-w-2xl text-base leading-7 text-[var(--color-text-soft)] sm:text-lg">
          {slide.footnote}
        </p>
      )}
    </div>
  );
}

function GridSlide({ slide }: { slide: Extract<Slide, { layout: "grid" }> }) {
  return (
    <div>
      <Headline
        parts={slide.headline}
        className="max-w-4xl [--h:clamp(1.9rem,5vw,3.6rem)]"
      />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {slide.items.map((item) => (
          <div
            key={item.title}
            className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-strong)] p-6 sm:p-8"
          >
            <p className="text-xl font-medium text-[var(--color-text)] lowercase">
              {item.title}
            </p>
            {item.body && (
              <p className="mt-2.5 text-[14px] leading-6 text-[var(--color-text-muted)]">
                {item.body}
              </p>
            )}
          </div>
        ))}
      </div>
      {slide.footnote && (
        <div className="mt-10 flex justify-end">
          <Footnote parts={slide.footnote} />
        </div>
      )}
    </div>
  );
}

function CirclesSlide({
  slide,
}: {
  slide: Extract<Slide, { layout: "circles" }>;
}) {
  return (
    <div>
      <Headline
        parts={slide.headline}
        className="max-w-4xl [--h:clamp(1.9rem,5vw,3.6rem)]"
      />
      <div className="mt-12 grid grid-cols-2 justify-items-center gap-6 lg:flex lg:flex-nowrap lg:justify-between">
        {slide.items.map((item, i) => (
          <div
            key={item.title}
            className={`flex aspect-square w-36 flex-col items-center justify-center rounded-full border px-5 text-center sm:w-44 lg:w-48 ${
              i % 2 === 0
                ? "border-transparent bg-[var(--color-accent-soft)]"
                : "border-[var(--color-line-strong)] bg-[var(--color-panel)]"
            }`}
          >
            <p className="text-[15px] font-medium text-[var(--color-text)] lowercase sm:text-base">
              {item.title}
            </p>
            {item.body && (
              <p className="mt-1.5 text-[11px] leading-4 text-[var(--color-text-muted)] sm:text-[12px] sm:leading-5">
                {item.body}
              </p>
            )}
          </div>
        ))}
      </div>
      {slide.footnote && (
        <div className="mt-12 flex justify-end">
          <Footnote parts={slide.footnote} />
        </div>
      )}
    </div>
  );
}

function SplitSlide({ slide }: { slide: Extract<Slide, { layout: "split" }> }) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <Headline
          parts={slide.headline}
          className="max-w-2xl [--h:clamp(1.7rem,5vw,3.4rem)]"
        />
        <ul className="mt-10 grid gap-3">
          {slide.bullets.map((b) => (
            <li
              key={b}
              className="flex items-center gap-3.5 text-lg text-[var(--color-text-muted)] sm:text-xl"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="hidden lg:block">
        <FlatIllustration name={slide.illustration} />
      </div>
    </div>
  );
}

function ClosingSlide({
  slide,
}: {
  slide: Extract<Slide, { layout: "closing" }>;
}) {
  return (
    <div className="max-w-4xl">
      <Headline parts={slide.headline} />
      <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--color-text-muted)] sm:text-xl">
        {slide.sub}
      </p>
      <a
        href={`https://${slide.cta}`}
        target="_blank"
        rel="noreferrer"
        className="tap mt-12 inline-flex items-center gap-2.5 rounded-full bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
      >
        {slide.cta}
        <Arrow direction="right" />
      </a>
    </div>
  );
}

/* ───────────────────────── primitives ───────────────────────── */

function FlatIllustration({ name }: { name: IllustrationName }) {
  const asset = illustrationAssets[name];
  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={900}
      height={680}
      priority={name === "online-meetings"}
      className="ml-auto h-[min(46vh,420px)] w-full max-w-md object-contain"
    />
  );
}

function Arrow({ direction }: { direction: "left" | "right" }) {
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
