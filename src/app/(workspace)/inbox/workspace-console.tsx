"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { CalEvent } from "../calendar/calendar-view";

export type Thread = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
  priority: string;
  body?: string;
  commitment?: {
    title: string;
    owner: string;
    counterparty: string;
    deadline: string;
    confidence: string;
  };
};

const priorityTone: Record<string, string> = {
  URGENT: "text-[var(--color-danger)] bg-[var(--color-danger-soft)]",
  NEW: "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
  PRIORITY: "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
  "NEEDS REPLY": "text-[var(--color-warning)] bg-[var(--color-warning-soft)]",
  "WAITING ON": "text-[var(--color-text-soft)] bg-[var(--color-panel-strong)]",
  OPEN: "text-[var(--color-text-soft)] bg-[var(--color-panel-strong)]",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7));
}
function fmtTime(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? "pm" : "am";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display}${period}` : `${display}:${String(m).padStart(2, "0")}${period}`;
}

function Tag({ label }: { label: string }) {
  const tone =
    priorityTone[label] ??
    "text-[var(--color-text-soft)] bg-[var(--color-panel-strong)]";
  return (
    <span
      className={`inline-flex rounded-[var(--radius-sm)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] ${tone}`}
    >
      {label}
    </span>
  );
}

function openCommand() {
  window.dispatchEvent(new Event("koda:command-open"));
}

type PaneId = "list" | "detail" | "calendar";

function CollapsedRail({
  title,
  onExpand,
}: {
  title: string;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex shrink-0 items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-text-soft)] transition hover:text-[var(--color-text)] lg:h-full lg:w-11 lg:flex-col lg:justify-start lg:px-0 lg:py-3"
    >
      <span className="font-mono text-[12px]">⊕</span>
      <span className="kicker lg:[writing-mode:vertical-rl] lg:rotate-180">
        {title}
      </span>
    </button>
  );
}

function PaneHeader({
  title,
  count,
  onCollapse,
  children,
}: {
  title: string;
  count?: string;
  onCollapse: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-text)] uppercase">
          {title}
        </span>
        {count && (
          <span className="font-mono text-[10px] text-[var(--color-text-soft)]">
            {count}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {children}
        <button
          type="button"
          onClick={onCollapse}
          aria-label={`Collapse ${title}`}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
        >
          ⊟
        </button>
      </div>
    </div>
  );
}

export function WorkspaceConsole({
  threads,
  events,
  nowISO,
}: {
  threads: Thread[];
  events: CalEvent[];
  nowISO: string;
}) {
  const [collapsed, setCollapsed] = useState<Record<PaneId, boolean>>({
    list: false,
    detail: false,
    calendar: false,
  });
  const [selectedId, setSelectedId] = useState(threads[0]?.id);
  const [mailQuery, setMailQuery] = useState("");
  const [mailFilter, setMailFilter] = useState<"focused" | "all">("focused");

  const FOCUSED_PRIORITIES = new Set([
    "NEW",
    "PRIORITY",
    "URGENT",
    "NEEDS REPLY",
  ]);

  const visibleThreads = useMemo(() => {
    const q = mailQuery.trim().toLowerCase();
    return threads.filter((t) => {
      if (mailFilter === "focused" && !FOCUSED_PRIORITIES.has(t.priority))
        return false;
      if (!q) return true;
      return (
        t.from.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, mailQuery, mailFilter]);

  const active = threads.find((t) => t.id === selectedId) ?? threads[0];
  const toggle = (id: PaneId) =>
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const now = useMemo(() => new Date(nowISO), [nowISO]);

  const weekStrip = useMemo(() => {
    const start = startOfWeek(now);
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      const dots = events.filter((e) => {
        if (!e.start) return false;
        const d = new Date(e.start);
        return !Number.isNaN(d.getTime()) && startOfDay(d).getTime() === day.getTime();
      }).length;
      return {
        label: day.toLocaleDateString("en-US", { weekday: "narrow" }),
        date: day.getDate(),
        dots: Math.min(dots, 3),
        today: startOfDay(day).getTime() === startOfDay(now).getTime(),
      };
    });
  }, [events, now]);

  const agenda = useMemo(
    () =>
      events
        .filter((e) => e.start && new Date(e.start).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime())
        .slice(0, 5),
    [events, now],
  );

  const flex = (id: PaneId, open: string) =>
    collapsed[id] ? "lg:flex-none" : open;

  return (
    <div className="flex w-full flex-col gap-3 lg:h-full lg:min-h-0 lg:flex-row">
      {/* Mail list */}
      {collapsed.list ? (
        <CollapsedRail title="Mail" onExpand={() => toggle("list")} />
      ) : (
        <section
          className={`flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] lg:min-h-0 ${flex(
            "list",
            "lg:flex-[2]",
          )}`}
        >
          <PaneHeader
            title="Mail"
            count={`${visibleThreads.length}`}
            onCollapse={() => toggle("list")}
          />
          <div className="space-y-2 border-b border-[var(--color-line)] px-3 py-2">
            <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-1.5">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-soft)]"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="m11 11 3 3" strokeLinecap="round" />
              </svg>
              <input
                value={mailQuery}
                onChange={(e) => setMailQuery(e.target.value)}
                placeholder="Search mail"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
              />
              {mailQuery && (
                <button
                  type="button"
                  onClick={() => setMailQuery("")}
                  className="shrink-0 text-[12px] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              {(["focused", "all"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setMailFilter(f)}
                  className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-medium capitalize transition ${
                    mailFilter === f
                      ? "bg-[var(--color-panel-strong)] text-[var(--color-text)]"
                      : "text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-[var(--color-line)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {visibleThreads.length === 0 && (
              <p className="px-3.5 py-4 text-[12px] text-[var(--color-text-soft)]">
                {mailQuery
                  ? "No mail matches your search."
                  : "No focused mail right now."}
              </p>
            )}
            {visibleThreads.map((thread) => {
              const isActive = thread.id === active?.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  className={`block w-full px-3.5 py-3 text-left transition ${
                    isActive
                      ? "bg-[var(--color-panel-strong)]"
                      : "hover:bg-[var(--color-panel)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-medium text-[var(--color-text)]">
                      {thread.from}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-[var(--color-text-soft)]">
                      {thread.time}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--color-text-muted)]">
                    {thread.subject}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[12px] leading-5 text-[var(--color-text-soft)]">
                    {thread.preview}
                  </p>
                  <div className="mt-2">
                    <Tag label={thread.priority} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Mail detail */}
      {collapsed.detail ? (
        <CollapsedRail title="Thread" onExpand={() => toggle("detail")} />
      ) : (
        <section
          className={`flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] lg:min-h-0 ${flex(
            "detail",
            "lg:flex-[4]",
          )}`}
        >
          <PaneHeader title="Thread" onCollapse={() => toggle("detail")}>
            <button
              type="button"
              onClick={openCommand}
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              Reply
            </button>
          </PaneHeader>

          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
              <h2 className="text-base font-medium tracking-tight text-[var(--color-text)] sm:text-lg">
                {active?.subject}
              </h2>
              <p className="mt-1 text-[13px] text-[var(--color-text-soft)]">
                {active?.from} · to shubham@koda.dev · {active?.time}
              </p>
            </div>

            <div className="email-md px-4 py-5 text-[14px] leading-7 text-[var(--color-text-muted)] sm:px-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {active?.body ?? active?.preview ?? ""}
              </ReactMarkdown>
            </div>

            {active?.commitment && (
              <div className="mx-4 mb-5 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3.5 sm:mx-5">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                  <p className="kicker text-[var(--color-accent)]">
                    Extracted commitment
                  </p>
                </div>
                <p className="mt-2.5 text-[14px] font-medium leading-6 text-[var(--color-text)]">
                  {active.commitment.title}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                  {[
                    ["Owner", active.commitment.owner],
                    ["Counterparty", active.commitment.counterparty],
                    ["Deadline", active.commitment.deadline],
                    ["Confidence", active.commitment.confidence],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-text-soft)] uppercase">
                        {k}
                      </dt>
                      <dd className="truncate text-[var(--color-text-muted)]">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openCommand}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                  >
                    Draft reply
                  </button>
                  <button
                    type="button"
                    onClick={openCommand}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                  >
                    Add to calendar →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Calendar */}
      {collapsed.calendar ? (
        <CollapsedRail title="Calendar" onExpand={() => toggle("calendar")} />
      ) : (
        <section
          className={`flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] lg:min-h-0 ${flex(
            "calendar",
            "lg:flex-[2.4]",
          )}`}
        >
          <PaneHeader
            title="Calendar"
            count={now.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            onCollapse={() => toggle("calendar")}
          >
            <button
              type="button"
              onClick={openCommand}
              className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2 py-1 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
            >
              + New
            </button>
          </PaneHeader>

          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {/* Week strip */}
            <div className="grid grid-cols-7 gap-1 border-b border-[var(--color-line)] p-3">
              {weekStrip.map((d) => (
                <div
                  key={d.date}
                  className={`flex flex-col items-center gap-1 rounded-[var(--radius)] py-2 ${
                    d.today ? "bg-[var(--color-panel-strong)]" : ""
                  }`}
                >
                  <span className="font-mono text-[10px] text-[var(--color-text-soft)]">
                    {d.label}
                  </span>
                  <span
                    className={`text-[13px] font-medium ${
                      d.today
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-text)]"
                    }`}
                  >
                    {d.date}
                  </span>
                  <span className="flex h-1 gap-0.5">
                    {Array.from({ length: d.dots }).map((_, i) => (
                      <span
                        key={i}
                        className="h-1 w-1 rounded-full bg-[var(--color-accent)]"
                      />
                    ))}
                  </span>
                </div>
              ))}
            </div>

            {/* Agenda + linked deadline */}
            <div className="p-3">
              {active?.commitment && (
                <div className="mb-3 rounded-[var(--radius)] border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3 py-2.5">
                  <p className="kicker text-[var(--color-accent)]">
                    From open thread
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-[var(--color-text)]">
                    {active.commitment.deadline}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-muted)]">
                    {active.commitment.title}
                  </p>
                </div>
              )}

              <p className="kicker mb-1 px-1">Up next</p>
              <div className="space-y-0.5">
                {agenda.length === 0 && (
                  <p className="px-2 py-2 text-[13px] text-[var(--color-text-soft)]">
                    Nothing scheduled ahead.
                  </p>
                )}
                {agenda.map((item) => {
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
          </div>
        </section>
      )}
    </div>
  );
}
