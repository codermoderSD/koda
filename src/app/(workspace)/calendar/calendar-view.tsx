"use client";

import { useState } from "react";

import {
  agendaItems,
  calendarDeadlines,
  calendarEvents,
} from "../_components/mock-data";

type View = "day" | "week" | "month";

// Mock week: Mon Jun 8 – Fri Jun 12, 2026. "Today" = Thu (index 3 = Jun 11).
const weekDays = [
  { label: "Mon", date: 8 },
  { label: "Tue", date: 9 },
  { label: "Wed", date: 10 },
  { label: "Thu", date: 11 },
  { label: "Fri", date: 12 },
] as const;

const TODAY_INDEX = 3;
const START_HOUR = 8;
const END_HOUR = 18;
const ROW_HEIGHT = 56;

const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function hourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

function timeLabel(h: number) {
  const period = h >= 12 ? "pm" : "am";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

const toneBar: Record<string, string> = {
  accent: "border-l-[var(--color-accent)] bg-[var(--color-accent-soft)]",
  warning: "border-l-[var(--color-warning)] bg-[var(--color-warning-soft)]",
  success: "border-l-[var(--color-success)] bg-[var(--color-success-soft)]",
  neutral: "border-l-[var(--color-line-strong)] bg-[var(--color-panel-strong)]",
};

const toneDot: Record<string, string> = {
  accent: "bg-[var(--color-accent)]",
  warning: "bg-[var(--color-warning)]",
  success: "bg-[var(--color-success)]",
  neutral: "bg-[var(--color-text-soft)]",
};

function EventBlock({
  event,
  compact,
}: {
  event: (typeof calendarEvents)[number];
  compact?: boolean;
}) {
  return (
    <div
      className={`absolute right-1 left-1 overflow-hidden rounded-[var(--radius-sm)] border-l-2 px-2 py-1 ${
        toneBar[event.tone]
      }`}
      style={{
        top: (event.start - START_HOUR) * ROW_HEIGHT + 2,
        height: (event.end - event.start) * ROW_HEIGHT - 4,
      }}
    >
      <p className="truncate text-[12px] font-medium text-[var(--color-text)]">
        {event.title}
      </p>
      {!compact && (
        <p className="mt-0.5 font-mono text-[10px] text-[var(--color-text-soft)]">
          {timeLabel(event.start)}
        </p>
      )}
    </div>
  );
}

export function CalendarView() {
  const [view, setView] = useState<View>("week");

  const title =
    view === "day"
      ? "Thursday, Jun 11"
      : view === "week"
        ? "Jun 8 – 12, 2026"
        : "June 2026";

  return (
    <div className="flex w-full flex-col gap-4 lg:h-full lg:min-h-0">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium tracking-tight text-[var(--color-text)] sm:text-2xl">
            {title}
          </h1>
          <div className="flex items-center gap-1">
            <button className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)]">
              ‹
            </button>
            <button className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2.5 py-1 text-[12px] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)]">
              Today
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)]">
              ›
            </button>
          </div>
        </div>

        {/* View switcher */}
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
          {view === "day" && <DayGrid />}
          {view === "week" && <WeekGrid />}
          {view === "month" && <MonthGrid />}
        </section>

        <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="kicker">This week</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["6", "meetings"],
                ["3", "deadlines"],
                ["1", "overdue"],
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
              {agendaItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-[var(--radius)] px-2 py-2 transition hover:bg-[var(--color-panel)]"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[item.tone]}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-[var(--color-text)]">
                      {item.label}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--color-text-soft)]">
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DayGrid() {
  const dayEvents = calendarEvents.filter((e) => e.day === TODAY_INDEX);
  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-[60px_1fr]">
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
        <div className="relative">
          {hours.map((h) => (
            <div
              key={h}
              className="border-b border-[var(--color-line)] last:border-b-0"
              style={{ height: ROW_HEIGHT }}
            />
          ))}
          {dayEvents.map((event) => (
            <EventBlock key={event.title} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekGrid() {
  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[52px_repeat(5,minmax(0,1fr))] border-b border-[var(--color-line)]">
          <div className="border-r border-[var(--color-line)]" />
          {weekDays.map((day, index) => (
            <div
              key={day.label}
              className={`flex items-baseline gap-2 border-r border-[var(--color-line)] px-3 py-2.5 last:border-r-0 ${
                index === TODAY_INDEX ? "bg-[var(--color-panel)]" : ""
              }`}
            >
              <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--color-text-soft)] uppercase">
                {day.label}
              </span>
              <span
                className={`text-[15px] font-medium ${
                  index === TODAY_INDEX
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text)]"
                }`}
              >
                {day.date}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[52px_repeat(5,minmax(0,1fr))]">
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

          {weekDays.map((day, dayIndex) => (
            <div
              key={day.label}
              className={`relative border-r border-[var(--color-line)] last:border-r-0 ${
                dayIndex === TODAY_INDEX ? "bg-[var(--color-panel)]" : ""
              }`}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-b border-[var(--color-line)] last:border-b-0"
                  style={{ height: ROW_HEIGHT }}
                />
              ))}
              {calendarEvents
                .filter((event) => event.day === dayIndex)
                .map((event) => (
                  <EventBlock key={event.title} event={event} compact />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// June 2026 — Mon-start grid. June 1 is a Monday.
const monthWeeks: { date: number; muted?: boolean }[][] = [
  [1, 2, 3, 4, 5, 6, 7].map((d) => ({ date: d })),
  [8, 9, 10, 11, 12, 13, 14].map((d) => ({ date: d })),
  [15, 16, 17, 18, 19, 20, 21].map((d) => ({ date: d })),
  [22, 23, 24, 25, 26, 27, 28].map((d) => ({ date: d })),
  [
    { date: 29 },
    { date: 30 },
    { date: 1, muted: true },
    { date: 2, muted: true },
    { date: 3, muted: true },
    { date: 4, muted: true },
    { date: 5, muted: true },
  ],
];

// Map week events (Jun 8–12) onto month dates.
const monthEvents: Record<number, { tone: string; title: string }[]> = {
  8: [{ tone: "neutral", title: "Pipeline review" }],
  10: [{ tone: "warning", title: "Northwind follow-up" }],
  11: [
    { tone: "accent", title: "Coffee chat" },
    { tone: "accent", title: "Q3 prep" },
  ],
  12: [{ tone: "success", title: "Board deck" }],
};

function MonthGrid() {
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-[var(--color-line)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center font-mono text-[10px] tracking-[0.12em] text-[var(--color-text-soft)] uppercase"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-rows-5">
        {monthWeeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-[var(--color-line)] last:border-b-0">
            {week.map((cell, di) => {
              const isToday = !cell.muted && cell.date === 11;
              const events = cell.muted ? [] : (monthEvents[cell.date] ?? []);
              return (
                <div
                  key={`${wi}-${di}`}
                  className={`min-h-[72px] border-r border-[var(--color-line)] p-1.5 last:border-r-0 ${
                    isToday ? "bg-[var(--color-panel)]" : ""
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] ${
                      isToday
                        ? "bg-[var(--color-accent)] text-white"
                        : cell.muted
                          ? "text-[var(--color-text-soft)]"
                          : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {cell.date}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {events.slice(0, 2).map((e) => (
                      <div
                        key={e.title}
                        className="flex items-center gap-1 truncate text-[10px] text-[var(--color-text-muted)]"
                      >
                        <span
                          className={`h-1 w-1 shrink-0 rounded-full ${toneDot[e.tone]}`}
                        />
                        <span className="truncate">{e.title}</span>
                      </div>
                    ))}
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
