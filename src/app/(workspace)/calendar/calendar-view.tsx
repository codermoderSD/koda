"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";

import { DictationButton } from "../_components/dictation-button";

export type CalEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  description: string | null;
  location: string | null;
  attendees: string[];
  meetLink: string | null;
  status: string;
};

type FreeSlot = {
  start: string;
  end: string;
  localStart: string;
  localEnd: string;
  label: string;
};

type View = "day" | "week" | "month";
type EventFormState = {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  description: string;
  location: string;
  attendees: string;
};

const DAY_START = 0;
const DAY_END = 24;
const ROW_HEIGHT = 48;
const hours = Array.from(
  { length: DAY_END - DAY_START },
  (_, i) => DAY_START + i,
);

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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
  return m === 0
    ? `${display} ${period}`
    : `${display}:${String(m).padStart(2, "0")} ${period}`;
}
function hourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

function toLocalInput(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toFormTime(value: string | null, allDay: boolean) {
  if (!value) return "";
  if (allDay) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 16) : toLocalInput(date);
}

function normalizeFormTime(value: string, allDay: boolean) {
  if (allDay) return value;
  return value.length === 16 ? `${value}:00` : value;
}

function defaultEventForm(now: Date): EventFormState {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 30 * 60000);
  return {
    title: "",
    start: toLocalInput(start),
    end: toLocalInput(end),
    allDay: false,
    description: "",
    location: "",
    attendees: "",
  };
}

function formFromEvent(event: CalEvent): EventFormState {
  return {
    title: event.title,
    start: toFormTime(event.start, event.allDay),
    end: toFormTime(event.end, event.allDay),
    allDay: event.allDay,
    description: event.description ?? "",
    location: event.location ?? "",
    attendees: event.attendees.join(", "),
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as
    | T
    | { error?: string };
  if (!response.ok) {
    const error =
      typeof payload === "object" && payload !== null && "error" in payload
        ? payload.error
        : undefined;
    throw new Error(
      typeof error === "string" && error ? error : "Request failed.",
    );
  }
  return payload as T;
}

async function fetchCalendarWindow(nowISO: string) {
  return readJson<{ events: CalEvent[] }>(
    await fetch(
      `/api/koda/calendar/events?now=${encodeURIComponent(nowISO)}&t=${Date.now()}`,
      {
        cache: "no-store",
      },
    ),
  );
}

function formPayload(form: EventFormState) {
  const attendees = form.attendees
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return {
    title: form.title,
    start: normalizeFormTime(form.start, form.allDay),
    end: normalizeFormTime(form.end, form.allDay),
    allDay: form.allDay,
    description: form.description || undefined,
    location: form.location || undefined,
    attendees: attendees.length > 0 ? attendees : undefined,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sendUpdates: "all" as const,
  };
}

type Positioned = {
  ev: CalEvent;
  start: Date;
  end: Date;
  column: number;
  columns: number;
};

type RawPositioned = Omit<Positioned, "column" | "columns">;

function layoutTimedEvents(events: RawPositioned[]): Positioned[] {
  const sorted = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const laidOut: Positioned[] = [];
  let group: RawPositioned[] = [];
  let groupEnd = 0;

  function flushGroup() {
    if (group.length === 0) return;

    const columnEnds: number[] = [];
    const groupItems = group.map((item) => {
      const column = columnEnds.findIndex((end) => end <= item.start.getTime());
      const assignedColumn = column === -1 ? columnEnds.length : column;
      columnEnds[assignedColumn] = item.end.getTime();
      return { ...item, column: assignedColumn, columns: 1 };
    });

    const columns = Math.max(columnEnds.length, 1);
    laidOut.push(...groupItems.map((item) => ({ ...item, columns })));
    group = [];
    groupEnd = 0;
  }

  for (const event of sorted) {
    const start = event.start.getTime();
    const end = event.end.getTime();
    if (group.length > 0 && start >= groupEnd) {
      flushGroup();
    }
    group.push(event);
    groupEnd = Math.max(groupEnd, end);
  }
  flushGroup();

  return laidOut;
}

function positioned(events: CalEvent[]): {
  timed: Positioned[];
  allDay: CalEvent[];
} {
  const timed: RawPositioned[] = [];
  const allDay: CalEvent[] = [];
  for (const ev of events) {
    if (ev.allDay || !ev.start) {
      allDay.push(ev);
      continue;
    }
    const start = new Date(ev.start);
    const end = ev.end
      ? new Date(ev.end)
      : new Date(start.getTime() + 30 * 60000);
    if (Number.isNaN(start.getTime())) continue;
    timed.push({ ev, start, end });
  }
  return { timed: layoutTimedEvents(timed), allDay };
}

function EventBlock({
  p,
  onSelect,
}: {
  p: Positioned;
  onSelect: (event: CalEvent) => void;
}) {
  const top = (hourFraction(p.start) - DAY_START) * ROW_HEIGHT;
  const rawH = (hourFraction(p.end) - hourFraction(p.start)) * ROW_HEIGHT;
  const height = Math.max(rawH - 3, 18);
  const gutter = 4;
  const left = `calc(${(p.column / p.columns) * 100}% + ${gutter / 2}px)`;
  const width = `calc(${100 / p.columns}% - ${gutter}px)`;
  return (
    <button
      type="button"
      onClick={() => onSelect(p.ev)}
      className="absolute overflow-hidden rounded-[var(--radius-sm)] border-l-2 border-l-[var(--color-accent)] bg-[var(--color-accent-soft)] px-1.5 py-1 text-left"
      style={{ top: Math.max(top, 0), height, left, width }}
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
    </button>
  );
}

export function CalendarView({
  events,
  nowISO,
}: {
  events: CalEvent[];
  nowISO: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useMemo(() => new Date(nowISO), [nowISO]);
  const [view, setView] = useState<View>("week");
  const [ref, setRef] = useState<Date>(() => new Date(nowISO));
  const [calendarEvents, setCalendarEvents] = useState(events);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<EventFormState>(() =>
    defaultEventForm(new Date(nowISO)),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rescheduleSlots, setRescheduleSlots] = useState<FreeSlot[]>([]);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [rescheduleStatus, setRescheduleStatus] = useState<string | null>(null);

  const selected =
    calendarEvents.find((event) => event.id === selectedId) ?? null;

  useEffect(() => {
    setCalendarEvents(events);
  }, [events]);

  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (!eventId) return;
    const event = calendarEvents.find((item) => item.id === eventId);
    if (!event) return;
    selectEvent(event);
    if (event.start) {
      const start = new Date(event.start);
      if (!Number.isNaN(start.getTime())) setRef(start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarEvents, searchParams]);

  useEffect(() => {
    function refreshData() {
      void fetchCalendarWindow(nowISO)
        .then((payload) => setCalendarEvents(payload.events))
        .finally(() => router.refresh());
      window.setTimeout(() => {
        void fetchCalendarWindow(nowISO)
          .then((payload) => setCalendarEvents(payload.events))
          .finally(() => router.refresh());
      }, 1200);
    }
    window.addEventListener("koda:data-refresh", refreshData);
    return () => window.removeEventListener("koda:data-refresh", refreshData);
  }, [nowISO, router]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of calendarEvents) {
      if (!ev.start) continue;
      const d = new Date(ev.start);
      if (Number.isNaN(d.getTime())) continue;
      const key = startOf(d).toDateString();
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [calendarEvents]);

  const dayEvents = (d: Date) =>
    eventsByDay.get(startOf(d).toDateString()) ?? [];

  const upNext = useMemo(
    () =>
      calendarEvents
        .filter((e) => e.start && new Date(e.start).getTime() >= now.getTime())
        .sort(
          (a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime(),
        )
        .slice(0, 6),
    [calendarEvents, now],
  );

  const weekStart = startOfWeek(ref);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEventCount = weekDays.reduce(
    (n, d) => n + dayEvents(d).filter((e) => !e.allDay).length,
    0,
  );

  function shift(dir: -1 | 1) {
    setRef((r) =>
      view === "day"
        ? addDays(r, dir)
        : view === "week"
          ? addDays(r, dir * 7)
          : addMonths(r, dir),
    );
  }

  function resetReschedule() {
    setRescheduleSlots([]);
    setRescheduleStatus(null);
  }

  function selectEvent(event: CalEvent) {
    setCreating(false);
    setSelectedId(event.id);
    setForm(formFromEvent(event));
    setStatus(null);
    resetReschedule();
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setForm(defaultEventForm(ref));
    setStatus(null);
    resetReschedule();
  }

  function closeEditor() {
    setCreating(false);
    setSelectedId(null);
    setStatus(null);
    resetReschedule();
  }

  function rescheduleDuration() {
    if (selected?.start && selected?.end) {
      const ms =
        new Date(selected.end).getTime() - new Date(selected.start).getTime();
      if (ms > 0) return Math.max(15, Math.round(ms / 60000));
    }
    return 30;
  }

  async function suggestReschedule() {
    if (!selected) return;
    setRescheduleBusy(true);
    setRescheduleStatus(null);
    setRescheduleSlots([]);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const payload = await readJson<{ slots: FreeSlot[] }>(
        await fetch("/api/koda/calendar/free-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationMinutes: rescheduleDuration(),
            horizonDays: 14,
            timeZone,
            maxResults: 3,
          }),
        }),
      );
      setRescheduleSlots(payload.slots);
      setRescheduleStatus(
        payload.slots.length > 0
          ? "Pick a new time, attendees get the update."
          : "No free slots in the next two weeks.",
      );
    } catch (error) {
      setRescheduleStatus(
        error instanceof Error ? error.message : "Could not find free slots.",
      );
    } finally {
      setRescheduleBusy(false);
    }
  }

  async function applyReschedule(slot: FreeSlot) {
    if (!selected) return;
    setRescheduleBusy(true);
    setRescheduleStatus(null);
    try {
      const payload = await readJson<{ event: CalEvent }>(
        await fetch(
          `/api/koda/calendar/events/${encodeURIComponent(selected.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...formPayload(form),
              start: slot.localStart,
              end: slot.localEnd,
              allDay: false,
              sendUpdates: "all",
            }),
          },
        ),
      );
      setCalendarEvents((current) =>
        current.map((event) =>
          event.id === payload.event.id ? payload.event : event,
        ),
      );
      setSelectedId(payload.event.id);
      setForm(formFromEvent(payload.event));
      setRescheduleSlots([]);
      setRescheduleStatus(null);
      setStatus(`Rescheduled to ${slot.label}. Attendees notified.`);
      window.dispatchEvent(new Event("koda:data-refresh"));
    } catch (error) {
      setRescheduleStatus(
        error instanceof Error ? error.message : "Could not reschedule.",
      );
    } finally {
      setRescheduleBusy(false);
    }
  }

  async function createEvent() {
    setBusy(true);
    setStatus(null);
    try {
      const payload = await readJson<{ event: CalEvent }>(
        await fetch("/api/koda/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formPayload(form)),
        }),
      );
      setCalendarEvents((current) => [...current, payload.event]);
      setCreating(false);
      setSelectedId(payload.event.id);
      setForm(formFromEvent(payload.event));
      setStatus("Event created.");
      window.dispatchEvent(new Event("koda:data-refresh"));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not create event.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateEvent() {
    if (!selected) return;
    setBusy(true);
    setStatus(null);
    try {
      const payload = await readJson<{ event: CalEvent }>(
        await fetch(
          `/api/koda/calendar/events/${encodeURIComponent(selected.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formPayload(form)),
          },
        ),
      );
      setCalendarEvents((current) =>
        current.map((event) =>
          event.id === payload.event.id ? payload.event : event,
        ),
      );
      setSelectedId(payload.event.id);
      setForm(formFromEvent(payload.event));
      setStatus("Event updated.");
      window.dispatchEvent(new Event("koda:data-refresh"));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not update event.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent() {
    if (!selected) return;
    setBusy(true);
    setStatus(null);
    try {
      await readJson<{ deleted: { id: string } }>(
        await fetch(
          `/api/koda/calendar/events/${encodeURIComponent(selected.id)}`,
          {
            method: "DELETE",
          },
        ),
      );
      setCalendarEvents((current) =>
        current.filter((event) => event.id !== selected.id),
      );
      setSelectedId(null);
      setForm(defaultEventForm(ref));
      setStatus("Event deleted.");
      window.dispatchEvent(new Event("koda:data-refresh"));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not delete event.",
      );
    } finally {
      setBusy(false);
    }
  }

  const title =
    view === "day"
      ? ref.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      : view === "week"
        ? `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : `${MONTH_NAMES[ref.getMonth()]} ${ref.getFullYear()}`;

  return (
    <div className="flex w-full flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="display text-xl sm:text-2xl">{title}</h1>
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
        <button
          type="button"
          onClick={startCreate}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
        >
          New event
        </button>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] lg:min-h-0">
          {view === "day" && (
            <DayGrid
              date={ref}
              now={now}
              events={dayEvents(ref)}
              onSelect={selectEvent}
            />
          )}
          {view === "week" && (
            <WeekGrid
              days={weekDays}
              now={now}
              dayEvents={dayEvents}
              onSelect={selectEvent}
            />
          )}
          {view === "month" && (
            <MonthGrid
              ref={ref}
              now={now}
              dayEvents={dayEvents}
              onSelect={selectEvent}
            />
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
                <div className="flex flex-col items-center px-1 py-6 text-center">
                  <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-text-soft)]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3.5" y="5" width="17" height="15" rx="2" />
                      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
                    </svg>
                  </span>
                  <p className="text-[12px] text-[var(--color-text-soft)]">
                    Nothing scheduled ahead.
                  </p>
                </div>
              )}
              {upNext.map((item) => {
                const d = new Date(item.start!);
                return (
                  <button
                    type="button"
                    onClick={() => selectEvent(item)}
                    key={item.id}
                    className="flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2 py-2 text-left transition hover:bg-[var(--color-panel)]"
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
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {(creating || selected) && (
        <EventDialog onClose={closeEditor}>
          <EventEditor
            mode={creating ? "create" : "edit"}
            form={form}
            setForm={setForm}
            busy={busy}
            status={status}
            onSave={creating ? createEvent : updateEvent}
            onDelete={creating ? undefined : deleteEvent}
            onClose={closeEditor}
            rescheduleSlots={rescheduleSlots}
            rescheduleBusy={rescheduleBusy}
            rescheduleStatus={rescheduleStatus}
            onSuggestReschedule={creating ? undefined : suggestReschedule}
            onApplyReschedule={applyReschedule}
          />
        </EventDialog>
      )}
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

function EventDialog({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <button
        type="button"
        aria-label="Close event editor"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="pop relative z-10 max-h-[calc(100vh-48px)] w-[min(560px,calc(100vw-32px))] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function EventEditor({
  mode,
  form,
  setForm,
  busy,
  status,
  onSave,
  onDelete,
  onClose,
  rescheduleSlots,
  rescheduleBusy,
  rescheduleStatus,
  onSuggestReschedule,
  onApplyReschedule,
}: {
  mode: "create" | "edit";
  form: EventFormState;
  setForm: Dispatch<SetStateAction<EventFormState>>;
  busy: boolean;
  status: string | null;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
  rescheduleSlots: FreeSlot[];
  rescheduleBusy: boolean;
  rescheduleStatus: string | null;
  onSuggestReschedule?: () => void;
  onApplyReschedule: (slot: FreeSlot) => void;
}) {
  const timeType = form.allDay ? "date" : "datetime-local";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-panel-elevated)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <p className="kicker">
          {mode === "create" ? "Create event" : "Event details"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 space-y-2.5">
        <input
          value={form.title}
          onChange={(e) =>
            setForm((current) => ({ ...current, title: e.target.value }))
          }
          placeholder="Title"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-2 text-[13px] text-[var(--color-text)] outline-none"
        />
        <label className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={form.allDay}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                allDay: e.target.checked,
                start: e.target.checked
                  ? current.start.slice(0, 10)
                  : current.start.includes("T")
                    ? current.start
                    : `${current.start}T09:00`,
                end: e.target.checked
                  ? current.end.slice(0, 10)
                  : current.end.includes("T")
                    ? current.end
                    : `${current.end}T09:30`,
              }))
            }
          />
          All day
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type={timeType}
            value={form.start}
            onChange={(e) =>
              setForm((current) => ({ ...current, start: e.target.value }))
            }
            className="min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1.5 text-[12px] text-[var(--color-text)] outline-none"
          />
          <input
            type={timeType}
            value={form.end}
            onChange={(e) =>
              setForm((current) => ({ ...current, end: e.target.value }))
            }
            className="min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1.5 text-[12px] text-[var(--color-text)] outline-none"
          />
        </div>
        <input
          value={form.location}
          onChange={(e) =>
            setForm((current) => ({ ...current, location: e.target.value }))
          }
          placeholder="Location"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-2 text-[13px] text-[var(--color-text)] outline-none"
        />
        <input
          value={form.attendees}
          onChange={(e) =>
            setForm((current) => ({ ...current, attendees: e.target.value }))
          }
          placeholder="Attendees, comma separated"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-2 text-[13px] text-[var(--color-text)] outline-none"
        />
        <div className="relative">
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                description: e.target.value,
              }))
            }
            placeholder="Description"
            rows={3}
            className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-2 pr-11 text-[13px] text-[var(--color-text)] outline-none"
          />
          <DictationButton
            value={form.description}
            onChange={(value) =>
              setForm((current) => ({ ...current, description: value }))
            }
            onSubmit={onSave}
            disabled={busy}
            className="absolute top-2 right-2"
          />
        </div>
      </div>
      {mode === "edit" && onSuggestReschedule && (
        <div className="mt-3 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="kicker">Reschedule</p>
            <button
              type="button"
              onClick={onSuggestReschedule}
              disabled={rescheduleBusy}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
            >
              {rescheduleBusy ? "Finding…" : "Suggest new times"}
            </button>
          </div>
          {rescheduleStatus && (
            <p className="mt-2 text-[12px] text-[var(--color-text-soft)]">
              {rescheduleStatus}
            </p>
          )}
          {rescheduleSlots.length > 0 && (
            <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
              {rescheduleSlots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => onApplyReschedule(slot)}
                  disabled={rescheduleBusy}
                  className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-left transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] disabled:opacity-60"
                >
                  <span className="block font-mono text-[10px] tracking-[0.08em] text-[var(--color-accent)] uppercase">
                    Free slot
                  </span>
                  <span className="mt-1 block text-[12px] leading-5 text-[var(--color-text)]">
                    {slot.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {status && (
        <p className="mt-3 text-[12px] text-[var(--color-text-soft)]">
          {status}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
        >
          {busy ? "Saving..." : mode === "create" ? "Create" : "Save"}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-[var(--radius-sm)] border border-[var(--color-danger)] px-3 py-1.5 text-[12px] text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)] disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function AllDayRow({
  events,
  onSelect,
}: {
  events: CalEvent[];
  onSelect: (event: CalEvent) => void;
}) {
  if (events.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--color-line)] px-2 py-1.5">
      {events.map((e) => (
        <button
          type="button"
          onClick={() => onSelect(e)}
          key={e.id}
          className="truncate rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--color-text)]"
        >
          {e.title}
        </button>
      ))}
    </div>
  );
}

function DayGrid({
  date,
  now,
  events,
  onSelect,
}: {
  date: Date;
  now: Date;
  events: CalEvent[];
  onSelect: (event: CalEvent) => void;
}) {
  const { timed, allDay } = positioned(events);
  const isToday = sameDay(date, now);
  return (
    <div className="h-full overflow-y-auto">
      <AllDayRow events={allDay} onSelect={onSelect} />
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
            <EventBlock key={p.ev.id} p={p} onSelect={onSelect} />
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
    <div
      className="absolute right-0 left-0 z-10 flex items-center"
      style={{ top }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
      <span className="h-px flex-1 bg-[var(--color-danger)]" />
    </div>
  );
}

function WeekGrid({
  days,
  now,
  dayEvents,
  onSelect,
}: {
  days: Date[];
  now: Date;
  dayEvents: (d: Date) => CalEvent[];
  onSelect: (event: CalEvent) => void;
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
                    today
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text)]"
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
            const { timed, allDay } = positioned(dayEvents(d));
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
                {allDay.length > 0 && (
                  <div className="absolute top-1 right-1 left-1 z-10 space-y-1">
                    {allDay.slice(0, 2).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelect(event)}
                        className="block w-full truncate rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-left text-[10px] text-[var(--color-text)]"
                      >
                        {event.title}
                      </button>
                    ))}
                  </div>
                )}
                {today && <NowLine now={now} />}
                {timed.map((p) => (
                  <EventBlock key={p.ev.id} p={p} onSelect={onSelect} />
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
  onSelect,
}: {
  ref: Date;
  now: Date;
  dayEvents: (d: Date) => CalEvent[];
  onSelect: (event: CalEvent) => void;
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
                      <button
                        type="button"
                        onClick={() => onSelect(e)}
                        key={e.id}
                        className="flex w-full items-center gap-1 truncate text-left text-[10px] text-[var(--color-text-muted)]"
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent)]" />
                        <span className="truncate">{e.title}</span>
                      </button>
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
