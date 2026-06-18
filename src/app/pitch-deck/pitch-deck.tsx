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
    sub: "Gmail and Google Calendar behind one command, and one voice. See your mail and schedule together, then draft, send, and book in realtime.",
    presenter: "Shubham Dalvi",
    illustration: "online-meetings",
  },
  {
    layout: "statement",
    kicker: "The problem",
    headline: [
      { t: "your day is split between " },
      { t: "gmail", hl: true },
      { t: " and your " },
      { t: "calendar", hl: true },
    ],
    sub: "Every meeting starts in a thread and ends on a calendar, so you live in two tabs, copying context back and forth.",
  },
  {
    layout: "flow",
    kicker: "The loop",
    headline: [
      { t: "and the scheduling loop " },
      { t: "never ends", hl: true },
    ],
    steps: [
      "email a connect",
      "open calendar",
      "availability clashes",
      "send a reschedule",
      "repeat",
    ],
    footnote:
      "Meanwhile reminders and the promises you made stay stuck in your head.",
  },
  {
    layout: "statement",
    kicker: "The cost",
    headline: [
      { t: "every tab switch costs " },
      { t: "time", hl: true },
      { t: ", " },
      { t: "focus", hl: true },
      { t: ", and " },
      { t: "follow-ups", hl: true },
    ],
    sub: "The reply you forgot to send and the meeting you forgot to move are the expensive ones.",
  },
  {
    layout: "statement",
    kicker: "Why now",
    headline: [
      { t: "ai can finally " },
      { t: "act", hl: true },
      { t: ", not just autocomplete" },
    ],
    sub: "A model can now read a thread, check a calendar, draft the reply, and book the meeting, if something wires it to your real data.",
  },
  {
    layout: "statement",
    kicker: "The solution",
    headline: [
      { t: "koda puts mail and calendar behind " },
      { t: "one command", hl: true },
    ],
    sub: "See both in one workspace. Ask in plain language, or just speak, and KODA drafts, schedules, reschedules, and sends in realtime.",
  },
  {
    layout: "flow",
    kicker: "How it works",
    headline: [{ t: "ask once. " }, { t: "koda does the rest", hl: true }],
    steps: [
      "type or speak",
      "koda reads mail + calendar",
      "it drafts & schedules",
      "sends in realtime",
      "loop closed",
    ],
  },
  {
    layout: "grid",
    kicker: "The product",
    headline: [{ t: "one workspace, " }, { t: "one command", hl: true }],
    items: [
      {
        title: "one command",
        body: "Search, draft, send, schedule, reschedule, across mail and calendar from ⌘K.",
      },
      {
        title: "voice control",
        body: "Press ⌘⇧K and just talk. No holding down buttons",
      },
      {
        title: "draft & reply",
        body: "Ask KODA to write the reminder or reply, it composes and sends for you.",
      },
      {
        title: "schedule in place",
        body: "Create events, move them, and find free slots without leaving the thread.",
      },
    ],
    footnote: [
      { t: "no tab-switching, " },
      { t: "no typing", hl: true },
      { t: "." },
    ],
  },
  {
    layout: "split",
    kicker: "Hands-free",
    headline: [
      { t: "just " },
      { t: "talk", hl: true },
      { t: ". koda types, schedules, and sends." },
    ],
    bullets: [
      "“remind the team about the deck”",
      "“move my 3pm to thursday”",
      "“reply that i'll confirm tomorrow”",
      "“what am i waiting on?”",
    ],
    illustration: "comment-sent",
  },
  {
    layout: "grid",
    kicker: "Why different",
    headline: [{ t: "it " }, { t: "acts", hl: true }, { t: ", in realtime" }],
    items: [
      {
        title: "no tab-switching",
        body: "Mail and calendar answered in one place.",
      },
      {
        title: "no typing",
        body: "Speak or one-line it; KODA writes the rest.",
      },
      {
        title: "no scheduling math",
        body: "Free slots and reschedules handled for you.",
      },
      {
        title: "nothing slips",
        body: "Commitments and deadlines tracked from your threads.",
      },
      {
        title: "@alias shortcuts",
        body: "Name contacts once. Type @cto in compose, KODA resolves it.",
      },
    ],
    footnote: [
      { t: "execution, " },
      { t: "not autocomplete", hl: true },
      { t: "." },
    ],
  },
  {
    layout: "circles",
    kicker: "Architecture",
    headline: [{ t: "live data, " }, { t: "real actions", hl: true }],
    items: [
      { title: "acquisition", body: "Gmail & Calendar via Corsair" },
      { title: "operational data", body: "Normalized state in Postgres" },
      { title: "agent", body: "9 AI tools over your data" },
      { title: "execution", body: "Draft, send & schedule in realtime" },
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
      { t: "for anyone who lives in " },
      { t: "gmail and calendar", hl: true },
    ],
    items: [
      { title: "founders & operators" },
      { title: "sales & partnerships" },
      { title: "recruiters & assistants" },
      { title: "consultants, legal & finance" },
    ],
    footnote: [
      { t: "where every meeting is " },
      { t: "another thread", hl: true },
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
      { title: "gmail sync, search, send & reply" },
      { title: "calendar create, move & free-slots" },
      { title: "⌘k agent · voice · @alias shortcuts" },
      { title: "drafts inbox · commitments · reminders" },
    ],
    footnote: [{ t: "deployed at " }, { t: "koda.shubhamdalvi.in", hl: true }],
  },
  {
    layout: "circles",
    kicker: "What's coming",
    headline: [{ t: "from one inbox to " }, { t: "team execution", hl: true }],
    items: [
      { title: "team availability", body: "Free slots across all attendees" },
      { title: "one-click schedule", body: "Book straight from an email" },
      { title: "proactive", body: "Auto reminders before things slip" },
      { title: "integrations", body: "Slack, Notion, CRM & more" },
    ],
    footnote: [
      { t: "the loop, " },
      { t: "closed for teams", hl: true },
      { t: "." },
    ],
  },
  {
    layout: "closing",
    kicker: "The ask",
    headline: [{ t: "help us " }, { t: "close the loop", hl: true }],
    sub: "Looking for feedback, product validation, and design partners to make KODA the way people run email and calendar.",
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
