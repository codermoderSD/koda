"use client";

import { useMemo, useState } from "react";

export type CalEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  attendees: string[];
  meetLink: string | null;
  status: string;
};

type View = "day" | "week" | "month";

const DAY_START = 7; // 7 AM
const DAY_END = 21; // 9 PM
const ROW_HEIGHT = 48;
const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
function startOfWeek(date: Date) {
  const d = startOf(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -day);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function hourFraction(d: Date) {
  return d.getHours() + d.getMinutes() / 60;
}
function fmtTime(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? "pm" : "am";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display} ${period}` : `${display}:${String(m).padStart(2, "0")} ${period}`;
}
function hourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

type Positioned = { ev: CalEvent; start: Date; end: Date };

function positioned(events: CalEvent[]): { timed: Positioned[]; allDay: CalEvent[] } {
  const timed: Positioned[] = [];
  const allDay: CalEvent[] = [];
  for (const ev of events) {
    if (ev.allDay || !ev.start) {
      allDay.push(ev);
      continue;
    }
    const start = new Date(ev.start);
    const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + 30 * 60000);
    if (Number.isNaN(start.getTime())) continue;
    timed.push({ ev, start, end });
  }
  return { timed, allDay };
}

function EventBlock({ p }: { p: Positioned }) {
  const top = (hourFraction(p.start) - DAY_START) * ROW_HEIGHT;
  const rawH = (hourFraction(p.end) - hourFraction(p.start)) * ROW_HEIGHT;
  const height = Math.max(rawH - 3, 18);
  return (
    <div
      className="absolute right-1 left-1 overflow-hidden rounded-[var(--radius-sm)] border-l-2 border-l-[var(--color-accent)] bg-[var(--color-accent-soft)] px-1.5 py-1"
      style={{ top: Math.max(top, 0), height }}
      title={p.ev.title}
    >
      <p className="truncate text-[11px] font-medium text-[var(--color-text)]">
        {p.ev.title}
      </p>
      {height > 30 && (
        <p className="truncate font-mono text-[9px] text-[var(--color-text-soft)]">
          {fmtTime(p.start)}
        </p>
      )}
    </div>
  );
}

export function CalendarView({
  events,
  nowISO,
}: {
  events: CalEvent[];
  nowISO: string;
}) {
  const now = useMemo(() => new Date(nowISO), [nowISO]);
  const [view, setView] = useState<View>("week");
  const [ref, setRef] = useState<Date>(() => new Date(nowISO));

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of events) {
      if (!ev.start) continue;
      const d = new Date(ev.start);
      if (Number.isNaN(d.getTime())) continue;
      const key = startOf(d).toDateString();
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const dayEvents = (d: Date) => eventsByDay.get(startOf(d).toDateString()) ?? [];

  const upNext = useMemo(
    () =>
      events
        .filter((e) => e.start && new Date(e.start).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime())
        .slice(0, 6),
    [events, now],
  );

  const weekStart = startOfWeek(ref);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEventCount = weekDays.reduce(
    (n, d) => n + dayEvents(d).filter((e) => !e.allDay).length,
    0,
  );

  function shift(dir: -1 | 1) {
    setRef((r) =>
      view === "day" ? addDays(r, dir) : view === "week" ? addDays(r, dir * 7) : addMonths(r, dir),
    );
  }

  const title =
    view === "day"
      ? ref.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
      : view === "week"
        ? `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : `${MONTH_NAMES[ref.getMonth()]} ${ref.getFullYear()}`;

  return (
    <div className="flex w-full flex-col gap-4 lg:h-full lg:min-h-0">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium tracking-tight text-[var(--color-text)] sm:text-2xl">
            {title}
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)]"
            >
              ‹
            </button>
            <button
              onClick={() => setRef(new Date(nowISO))}
              className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2.5 py-1 text-[12px] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)]"
            >
              Today
            </button>
            <button
              onClick={() => shift(1)}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)]"
            >
              ›
            </button>
          </div>
        </div>

        <div className="flex rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-0.5">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-[var(--radius-sm)] px-3 py-1 text-[12px] font-medium capitalize transition ${
                view === v
                  ? "bg-[var(--color-panel-strong)] text-[var(--color-text)]"
                  : "text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] lg:min-h-0">
          {view === "day" && <DayGrid date={ref} now={now} events={dayEvents(ref)} />}
          {view === "week" && (
            <WeekGrid days={weekDays} now={now} dayEvents={dayEvents} />
          )}
          {view === "month" && (
            <MonthGrid ref={ref} now={now} dayEvents={dayEvents} />
          )}
        </section>

        <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="kicker">This week</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                [String(weekEventCount), "events"],
                [String(upNext.length), "upcoming"],
              ].map(([n, label]) => (
                <div
                  key={label}
                  className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-2.5 text-center"
                >
                  <p className="font-mono text-lg leading-none text-[var(--color-text)]">
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
            <p className="kicker">Up next</p>
            <div className="mt-3 space-y-1">
              {upNext.length === 0 && (
                <p className="px-1 py-2 text-[13px] text-[var(--color-text-soft)]">
                  Nothing scheduled ahead.
                </p>
              )}
              {upNext.map((item) => {
                const d = new Date(item.start!);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 rounded-[var(--radius)] px-2 py-2 transition hover:bg-[var(--color-panel)]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-[var(--color-text)]">
                        {item.title}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--color-text-soft)]">
                        {d.toLocaleDateString("en-US", { weekday: "short" })} ·{" "}
                        {item.allDay ? "All day" : fmtTime(d)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TimeColumn() {
  return (
    <div className="border-r border-[var(--color-line)]">
      {hours.map((h) => (
        <div
          key={h}
          className="flex items-start justify-end border-b border-[var(--color-line)] px-2 pt-1 font-mono text-[10px] text-[var(--color-text-soft)] last:border-b-0"
          style={{ height: ROW_HEIGHT }}
        >
          {hourLabel(h)}
        </div>
      ))}
    </div>
  );
}

function AllDayRow({ events }: { events: CalEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--color-line)] px-2 py-1.5">
      {events.map((e) => (
        <span
          key={e.id}
          className="truncate rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--color-text)]"
        >
          {e.title}
        </span>
      ))}
    </div>
  );
}

function DayGrid({ date, now, events }: { date: Date; now: Date; events: CalEvent[] }) {
  const { timed, allDay } = positioned(events);
  const isToday = sameDay(date, now);
  return (
    <div className="h-full overflow-y-auto">
      <AllDayRow events={allDay} />
      <div className="grid grid-cols-[56px_1fr]">
        <TimeColumn />
        <div className="relative">
          {hours.map((h) => (
            <div
              key={h}
              className="border-b border-[var(--color-line)] last:border-b-0"
              style={{ height: ROW_HEIGHT }}
            />
          ))}
          {isToday && <NowLine now={now} />}
          {timed.map((p) => (
            <EventBlock key={p.ev.id} p={p} />
          ))}
          {timed.length === 0 && allDay.length === 0 && (
            <p className="absolute top-3 left-3 text-[13px] text-[var(--color-text-soft)]">
              No events.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NowLine({ now }: { now: Date }) {
  const top = (hourFraction(now) - DAY_START) * ROW_HEIGHT;
  if (top < 0 || top > (DAY_END - DAY_START) * ROW_HEIGHT) return null;
  return (
    <div className="absolute right-0 left-0 z-10 flex items-center" style={{ top }}>
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
      <span className="h-px flex-1 bg-[var(--color-danger)]" />
    </div>
  );
}

function WeekGrid({
  days,
  now,
  dayEvents,
}: {
  days: Date[];
  now: Date;
  dayEvents: (d: Date) => CalEvent[];
}) {
  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-[var(--color-line)]">
          <div className="border-r border-[var(--color-line)]" />
          {days.map((d) => {
            const today = sameDay(d, now);
            return (
              <div
                key={d.toISOString()}
                className={`flex items-baseline gap-1.5 border-r border-[var(--color-line)] px-2 py-2.5 last:border-r-0 ${
                  today ? "bg-[var(--color-panel)]" : ""
                }`}
              >
                <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-soft)] uppercase">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span
                  className={`text-[14px] font-medium ${
                    today ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          <TimeColumn />
          {days.map((d) => {
            const { timed } = positioned(dayEvents(d));
            const today = sameDay(d, now);
            return (
              <div
                key={d.toISOString()}
                className={`relative border-r border-[var(--color-line)] last:border-r-0 ${
                  today ? "bg-[var(--color-panel)]" : ""
                }`}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-b border-[var(--color-line)] last:border-b-0"
                    style={{ height: ROW_HEIGHT }}
                  />
                ))}
                {today && <NowLine now={now} />}
                {timed.map((p) => (
                  <EventBlock key={p.ev.id} p={p} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  ref,
  now,
  dayEvents,
}: {
  ref: Date;
  now: Date;
  dayEvents: (d: Date) => CalEvent[];
}) {
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const weeks = Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-[var(--color-line)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-soft)] uppercase"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-rows-6">
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid grid-cols-7 border-b border-[var(--color-line)] last:border-b-0"
          >
            {week.map((cell) => {
              const inMonth = cell.getMonth() === ref.getMonth();
              const today = sameDay(cell, now);
              const evs = dayEvents(cell);
              return (
                <div
                  key={cell.toISOString()}
                  className={`min-h-[64px] border-r border-[var(--color-line)] p-1.5 last:border-r-0 ${
                    today ? "bg-[var(--color-panel)]" : ""
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] ${
                      today
                        ? "bg-[var(--color-accent)] text-white"
                        : inMonth
                          ? "text-[var(--color-text-muted)]"
                          : "text-[var(--color-text-soft)]"
                    }`}
                  >
                    {cell.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {evs.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-1 truncate text-[10px] text-[var(--color-text-muted)]"
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent)]" />
                        <span className="truncate">{e.title}</span>
                      </div>
                    ))}
                    {evs.length > 3 && (
                      <p className="text-[10px] text-[var(--color-text-soft)]">
                        +{evs.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
