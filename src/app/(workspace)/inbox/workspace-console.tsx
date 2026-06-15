"use client";

import { useRouter } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { CalEvent } from "../calendar/calendar-view";

export type Thread = {
  id: string;
  from: string;
  to?: string | null;
  subject: string;
  preview: string;
  time: string;
  priority: string;
  body?: string;
  messages: ThreadMessage[];
  commitment?: {
    title: string;
    owner: string;
    counterparty: string;
    deadline: string;
    confidence: string;
  };
};

type KodaEmailSearchResults = {
  query: string;
  threads?: Thread[];
};

function isCalendarOnlySearchQuery(query: string) {
  const lower = query.toLowerCase();
  const mentionsCalendar =
    /\b(events?|calendar|meetings?|invites?|attend|upcoming|schedule)\b/.test(
      lower,
    );
  const mentionsMail =
    /@|\b(emails?|mail|gmail|inbox|threads?|messages?|from|to|sent|received|subject)\b|\b(from|to|subject|newer|older|after|before|has|label|in):/.test(
      lower,
    );

  return mentionsCalendar && !mentionsMail;
}

type ThreadMessage = {
  id: string;
  from: string;
  to?: string | null;
  body: string;
  preview: string;
  time: string;
  receivedAt: string | null;
};

type QuickEventForm = {
  title: string;
  start: string;
  end: string;
  location: string;
  attendees: string;
  description: string;
};

type ComposeForm = {
  to: string;
  subject: string;
  body: string;
};

type KodaDraftReplyResponse = {
  status?: string;
  message?: string;
  components?: Array<
    | {
        type: "draft_reply";
        threadId: string;
        subject: string;
        to: string;
        body: string;
      }
    | { type: string; [key: string]: unknown }
  >;
  error?: string;
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
  return m === 0
    ? `${display}${period}`
    : `${display}:${String(m).padStart(2, "0")}${period}`;
}

function toLocalInput(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function defaultQuickEvent(now: Date): QuickEventForm {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 30 * 60000);
  return {
    title: "",
    start: toLocalInput(start),
    end: toLocalInput(end),
    location: "",
    attendees: "",
    description: "",
  };
}

function defaultCompose(): ComposeForm {
  return { to: "", subject: "", body: "" };
}

function formatThreadTime(value: string | null) {
  if (!value) return "Recently";
  const numeric = Number(value);
  const date = Number.isNaN(numeric) ? new Date(value) : new Date(numeric);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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

function QuickEventComposer({
  form,
  setForm,
  busy,
  status,
  onCreate,
}: {
  form: QuickEventForm;
  setForm: Dispatch<SetStateAction<QuickEventForm>>;
  busy: boolean;
  status: string | null;
  onCreate: () => void;
}) {
  const fieldClass =
    "w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]";
  const timeFieldClass =
    "min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-1.5 text-[12px] text-[var(--color-text)] outline-none";
  return (
    <div className="mb-3 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="kicker">Create event</p>
        <span className="font-mono text-[10px] text-[var(--color-text-soft)]">
          Calendar
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        <input
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
          placeholder="Title"
          className={fieldClass}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="datetime-local"
            value={form.start}
            onChange={(event) =>
              setForm((current) => ({ ...current, start: event.target.value }))
            }
            className={timeFieldClass}
          />
          <input
            type="datetime-local"
            value={form.end}
            onChange={(event) =>
              setForm((current) => ({ ...current, end: event.target.value }))
            }
            className={timeFieldClass}
          />
        </div>
        <input
          value={form.location}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              location: event.target.value,
            }))
          }
          placeholder="Location"
          className={fieldClass}
        />
        <input
          value={form.attendees}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              attendees: event.target.value,
            }))
          }
          placeholder="Attendees, comma separated"
          className={fieldClass}
        />
      </div>
      <textarea
        value={form.description}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            description: event.target.value,
          }))
        }
        rows={2}
        placeholder="Description"
        className="mt-2 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[13px] leading-5 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCreate}
          disabled={busy || !form.title.trim() || !form.start || !form.end}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create event"}
        </button>
        {status && (
          <p className="text-right text-[12px] text-[var(--color-text-soft)]">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}

function openCommand() {
  window.dispatchEvent(new Event("koda:command-open"));
}

function normalizeLocalEventTime(value: string) {
  return value.length === 16 ? `${value}:00` : value;
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
      <span className="kicker lg:rotate-180 lg:[writing-mode:vertical-rl]">
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
  nextPageToken,
  searchThreads,
  searchNextPageToken,
  searchQuery,
  initialTab,
  events,
  nowISO,
  selectedThreadId,
}: {
  threads: Thread[];
  nextPageToken: string | null;
  searchThreads: Thread[];
  searchNextPageToken: string | null;
  searchQuery: string;
  initialTab?: "focused" | "all" | "search";
  events: CalEvent[];
  nowISO: string;
  selectedThreadId?: string;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<PaneId, boolean>>({
    list: false,
    detail: false,
    calendar: false,
  });
  const [localThreads, setLocalThreads] = useState(threads);
  const [pageToken, setPageToken] = useState(nextPageToken);
  const [pageBusy, setPageBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const knownThreadIdsRef = useRef(new Set(threads.map((thread) => thread.id)));
  const refreshRequestedRef = useRef(false);
  const [highlightedThreadIds, setHighlightedThreadIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(
    selectedThreadId,
  );
  const [mailQuery, setMailQuery] = useState(searchQuery);
  const [mailFilter, setMailFilter] = useState<"focused" | "all" | "search">(
    initialTab === "search" && searchQuery
      ? "search"
      : (initialTab ?? "focused"),
  );
  const [localSearchThreads, setLocalSearchThreads] = useState(searchThreads);
  const [searchPageToken, setSearchPageToken] = useState(searchNextPageToken);
  const [searchBusy, setSearchBusy] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState<ComposeForm>(() =>
    defaultCompose(),
  );
  const [composeStatus, setComposeStatus] = useState<string | null>(null);
  const [composeBusy, setComposeBusy] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<string | null>(null);
  const [replyBusy, setReplyBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [commitmentBusy, setCommitmentBusy] = useState(false);
  const [commitmentStatus, setCommitmentStatus] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState<QuickEventForm>(() =>
    defaultQuickEvent(new Date(nowISO)),
  );
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [eventBusy, setEventBusy] = useState(false);
  const [localEvents, setLocalEvents] = useState(events);

  const FOCUSED_PRIORITIES = new Set([
    "NEW",
    "PRIORITY",
    "URGENT",
    "NEEDS REPLY",
  ]);

  const visibleThreads = useMemo(() => {
    const q = mailQuery.trim().toLowerCase();
    const source = mailFilter === "search" ? localSearchThreads : localThreads;
    return source.filter((t) => {
      if (mailFilter === "search") return true;
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
  }, [localThreads, localSearchThreads, mailQuery, mailFilter]);

  const allKnownThreads = useMemo(
    () => [...localSearchThreads, ...localThreads],
    [localSearchThreads, localThreads],
  );
  const active = selectedId
    ? (allKnownThreads.find((t) => t.id === selectedId) ?? null)
    : null;
  const toggle = (id: PaneId) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const now = useMemo(() => new Date(nowISO), [nowISO]);

  useEffect(() => {
    const previous = knownThreadIdsRef.current;
    const incoming = threads
      .filter((thread) => !previous.has(thread.id))
      .map((thread) => thread.id);
    if (refreshRequestedRef.current && incoming.length > 0) {
      setHighlightedThreadIds((current) => new Set([...current, ...incoming]));
    }
    knownThreadIdsRef.current = new Set(threads.map((thread) => thread.id));
    setLocalThreads(threads);
    setPageToken(nextPageToken);
    refreshRequestedRef.current = false;
    setRefreshBusy(false);
  }, [threads, nextPageToken]);

  useEffect(() => {
    setSelectedId(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    setLocalSearchThreads(searchThreads);
    setSearchPageToken(searchNextPageToken);
    setMailQuery(searchQuery);
    if (initialTab === "search" && searchQuery) {
      setMailFilter("search");
    } else if (initialTab && initialTab !== "search") {
      setMailFilter(initialTab);
    } else if (!searchQuery && mailFilter === "search") {
      setMailFilter("focused");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchThreads, searchNextPageToken, searchQuery, initialTab]);

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  useEffect(() => {
    function refreshData() {
      void fetchCalendarWindow(nowISO)
        .then((payload) => setLocalEvents(payload.events))
        .finally(() => router.refresh());
      window.setTimeout(() => {
        void fetchCalendarWindow(nowISO)
          .then((payload) => setLocalEvents(payload.events))
          .finally(() => router.refresh());
      }, 1200);
    }
    window.addEventListener("koda:data-refresh", refreshData);
    return () => window.removeEventListener("koda:data-refresh", refreshData);
  }, [nowISO, router]);

  useEffect(() => {
    function onSearchResults(event: Event) {
      const detail = (event as CustomEvent<KodaEmailSearchResults>).detail;
      const query = detail.query.trim();
      if (!query || isCalendarOnlySearchQuery(query)) return;
      router.push(`/inbox?tab=search&q=${encodeURIComponent(query)}`);
    }

    function onOpenThread(event: Event) {
      const detail = (event as CustomEvent<{ threadId: string }>).detail;
      if (!detail.threadId) return;
      setSelectedId(detail.threadId);
      const suffix =
        mailFilter === "search" && searchQuery
          ? `?tab=search&q=${encodeURIComponent(searchQuery)}`
          : tabParam(mailFilter);
      router.push(`/inbox/${encodeURIComponent(detail.threadId)}${suffix}`);
    }

    window.addEventListener("koda:email-search-results", onSearchResults);
    window.addEventListener("koda:open-thread", onOpenThread);
    return () => {
      window.removeEventListener("koda:email-search-results", onSearchResults);
      window.removeEventListener("koda:open-thread", onOpenThread);
    };
  }, [mailFilter, router, searchQuery]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("koda:active-thread", {
        detail: active
          ? {
              id: active.id,
              subject: active.subject,
              from: active.from,
              to: active.to,
              messages: active.messages.map((message) => ({
                from: message.from,
                to: message.to,
                body: message.body,
                time: message.time,
              })),
            }
          : null,
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("koda:active-thread", { detail: null }),
      );
    };
  }, [active]);

  const weekStrip = useMemo(() => {
    const start = startOfWeek(now);
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      const dots = localEvents.filter((e) => {
        if (!e.start) return false;
        const d = new Date(e.start);
        return (
          !Number.isNaN(d.getTime()) &&
          startOfDay(d).getTime() === day.getTime()
        );
      }).length;
      return {
        label: day.toLocaleDateString("en-US", { weekday: "narrow" }),
        date: day.getDate(),
        dots: Math.min(dots, 3),
        today: startOfDay(day).getTime() === startOfDay(now).getTime(),
      };
    });
  }, [localEvents, now]);

  const agenda = useMemo(
    () =>
      localEvents
        .filter((e) => e.start && new Date(e.start).getTime() >= now.getTime())
        .sort(
          (a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime(),
        )
        .slice(0, 5),
    [localEvents, now],
  );

  function parseRecipients(value: string) {
    return value
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
  }

  function appendMessage(threadId: string, message: ThreadMessage) {
    setLocalThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              from: message.from,
              to: message.to ?? thread.to,
              preview: message.preview,
              body: message.body,
              time: message.time,
              priority: "OPEN",
              messages: [...thread.messages, message],
            }
          : thread,
      ),
    );
  }

  function searchUrl(query: string, threadId?: string) {
    const params = new URLSearchParams({ tab: "search", q: query });
    return threadId
      ? `/inbox/${encodeURIComponent(threadId)}?${params.toString()}`
      : `/inbox?${params.toString()}`;
  }

  function tabParam(tab: "focused" | "all" | "search") {
    return tab === "all" ? "?tab=all" : "";
  }

  function listUrl(tab: "focused" | "all" | "search") {
    if (tab === "search" && searchQuery) return searchUrl(searchQuery);
    return `/inbox${tabParam(tab)}`;
  }

  function normalThreadUrl(
    threadId: string,
    tab: "focused" | "all" | "search" = mailFilter,
  ) {
    if (tab === "search" && searchQuery)
      return searchUrl(searchQuery, threadId);
    return `/inbox/${encodeURIComponent(threadId)}${tabParam(tab)}`;
  }

  function submitMailSearch() {
    const query = mailQuery.trim();
    if (!query) {
      router.push("/inbox");
      return;
    }
    setMailFilter("search");
    setSelectedId(undefined);
    router.push(searchUrl(query));
  }

  function refreshMail() {
    knownThreadIdsRef.current = new Set(
      localThreads.map((thread) => thread.id),
    );
    refreshRequestedRef.current = true;
    setRefreshBusy(true);
    router.refresh();
  }

  function mapApiThread(thread: {
    id: string;
    from: string;
    to: string | null;
    subject: string;
    preview: string;
    body: string | null;
    receivedAt: string | null;
    labels: string[];
    messages: Array<{
      id: string;
      from: string;
      to: string | null;
      body: string;
      preview: string;
      receivedAt: string | null;
    }>;
  }): Thread {
    return {
      id: thread.id,
      from: thread.from,
      to: thread.to,
      subject: thread.subject,
      preview: thread.preview,
      body: thread.body ?? thread.preview,
      time: formatThreadTime(thread.receivedAt),
      priority: thread.labels.includes("UNREAD")
        ? "NEW"
        : thread.labels.includes("IMPORTANT")
          ? "PRIORITY"
          : "OPEN",
      messages: thread.messages.map((message) => ({
        id: message.id,
        from: message.from,
        to: message.to,
        body: message.body,
        preview: message.preview,
        time: formatThreadTime(message.receivedAt),
        receivedAt: message.receivedAt,
      })),
    };
  }

  async function loadMoreMail() {
    if (!pageToken) return;
    setPageBusy(true);
    try {
      const payload = await readJson<{
        threads: Parameters<typeof mapApiThread>[0][];
        nextPageToken: string | null;
      }>(
        await fetch(
          `/api/inbox?maxResults=20&pageToken=${encodeURIComponent(pageToken)}`,
        ),
      );
      setLocalThreads((current) => [
        ...current,
        ...payload.threads.map(mapApiThread),
      ]);
      setPageToken(payload.nextPageToken);
    } finally {
      setPageBusy(false);
    }
  }

  async function loadMoreSearchMail() {
    const query = searchQuery.trim();
    if (!searchPageToken || !query) return;
    setSearchBusy(true);
    try {
      const payload = await readJson<{
        threads: Parameters<typeof mapApiThread>[0][];
        nextPageToken: string | null;
      }>(
        await fetch(
          `/api/inbox?maxResults=20&pageToken=${encodeURIComponent(searchPageToken)}&q=${encodeURIComponent(query)}`,
        ),
      );
      setLocalSearchThreads((current) => [
        ...current,
        ...payload.threads.map(mapApiThread),
      ]);
      setSearchPageToken(payload.nextPageToken);
    } finally {
      setSearchBusy(false);
    }
  }

  async function draftReplyWithAi() {
    if (!active) return;
    setDraftBusy(true);
    setReplyStatus(null);
    try {
      const payload = await readJson<KodaDraftReplyResponse>(
        await fetch("/api/koda/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Write a reply to the active email.",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            activeThread: {
              id: active.id,
              subject: active.subject,
              from: active.from,
              to: active.to,
              messages: active.messages.map((message) => ({
                from: message.from,
                to: message.to,
                body: message.body,
                time: message.time,
              })),
            },
          }),
        }),
      );
      const draft = payload.components?.find(
        (
          component,
        ): component is Extract<
          NonNullable<KodaDraftReplyResponse["components"]>[number],
          { type: "draft_reply" }
        > => component.type === "draft_reply",
      );
      if (!draft?.body) {
        throw new Error(payload.message ?? "Could not draft a reply.");
      }
      setReplyText(draft.body);
      setReplyStatus(`Drafted for ${draft.to}. Review before sending.`);
    } catch (error) {
      setReplyStatus(
        error instanceof Error ? error.message : "Could not draft reply.",
      );
    } finally {
      setDraftBusy(false);
    }
  }

  async function extractActiveCommitment() {
    if (!active) return;
    setCommitmentBusy(true);
    setCommitmentStatus(null);
    try {
      const payload = await readJson<{
        scanned: number;
        extracted: number;
        error?: string;
      }>(
        await fetch("/api/koda/commitments/extract-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: active.id,
            subject: active.subject,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            messages: (active.messages.length
              ? active.messages
              : [
                  {
                    from: active.from,
                    to: active.to,
                    body: active.body ?? active.preview,
                    time: active.time,
                  },
                ]
            ).map((message) => ({
              from: message.from,
              to: message.to,
              body: message.body,
              time: message.time,
            })),
          }),
        }),
      );
      setCommitmentStatus(
        payload.extracted > 0
          ? `Extracted ${payload.extracted} commitment${payload.extracted === 1 ? "" : "s"} from this thread.`
          : "No clear commitment found in this thread.",
      );
      router.refresh();
    } catch (error) {
      setCommitmentStatus(
        error instanceof Error
          ? error.message
          : "Could not extract this thread.",
      );
    } finally {
      setCommitmentBusy(false);
    }
  }

  async function sendReply() {
    if (!active) return;
    setReplyBusy(true);
    setReplyStatus(null);
    try {
      const payload = await readJson<{
        reply: {
          id: string | null;
          threadId: string;
          from: string;
          to: string[];
          body: string;
          sentAt: string;
        };
      }>(
        await fetch("/api/koda/gmail/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId: active.id, body: replyText }),
        }),
      );
      appendMessage(active.id, {
        id: payload.reply.id ?? `sent-${Date.now()}`,
        from: payload.reply.from,
        to: payload.reply.to.join(", "),
        body: payload.reply.body,
        preview: payload.reply.body,
        time: formatThreadTime(payload.reply.sentAt),
        receivedAt: payload.reply.sentAt,
      });
      setReplyText("");
      setReplyStatus("Reply sent.");
      window.dispatchEvent(new Event("koda:data-refresh"));
    } catch (error) {
      setReplyStatus(
        error instanceof Error ? error.message : "Could not send reply.",
      );
    } finally {
      setReplyBusy(false);
    }
  }

  async function sendCompose() {
    setComposeBusy(true);
    setComposeStatus(null);
    try {
      const payload = await readJson<{
        message: {
          id: string | null;
          threadId: string | null;
          from: string;
          to: string[];
          subject: string;
          body: string;
          sentAt: string;
        };
      }>(
        await fetch("/api/koda/gmail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: parseRecipients(composeForm.to),
            subject: composeForm.subject,
            body: composeForm.body,
          }),
        }),
      );
      const threadId = payload.message.threadId ?? `sent-${Date.now()}`;
      const sentMessage: ThreadMessage = {
        id: payload.message.id ?? `${threadId}-message`,
        from: payload.message.from,
        to: payload.message.to.join(", "),
        body: payload.message.body,
        preview: payload.message.body,
        time: formatThreadTime(payload.message.sentAt),
        receivedAt: payload.message.sentAt,
      };

      setLocalThreads((current) => [
        {
          id: threadId,
          from: payload.message.from,
          to: payload.message.to.join(", "),
          subject: payload.message.subject,
          preview: payload.message.body,
          body: payload.message.body,
          time: sentMessage.time,
          priority: "OPEN",
          messages: [sentMessage],
        },
        ...current,
      ]);
      setSelectedId(threadId);
      setComposeForm(defaultCompose());
      setComposeOpen(false);
      setComposeStatus(null);
      window.dispatchEvent(new Event("koda:data-refresh"));
    } catch (error) {
      setComposeStatus(
        error instanceof Error ? error.message : "Could not send email.",
      );
    } finally {
      setComposeBusy(false);
    }
  }

  async function createQuickEvent() {
    setEventBusy(true);
    setEventStatus(null);
    try {
      const attendees = parseRecipients(eventForm.attendees);
      const payload = await readJson<{ event: CalEvent }>(
        await fetch("/api/koda/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: eventForm.title,
            start: normalizeLocalEventTime(eventForm.start),
            end: normalizeLocalEventTime(eventForm.end),
            location: eventForm.location || undefined,
            attendees: attendees.length > 0 ? attendees : undefined,
            description: eventForm.description || undefined,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            sendUpdates: "all",
          }),
        }),
      );
      setLocalEvents((current) => [...current, payload.event]);
      setEventForm(defaultQuickEvent(now));
      setEventOpen(false);
      setEventStatus("Event created.");
      window.dispatchEvent(new Event("koda:data-refresh"));
    } catch (error) {
      setEventStatus(
        error instanceof Error ? error.message : "Could not create event.",
      );
    } finally {
      setEventBusy(false);
    }
  }

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
            count={
              mailFilter === "search"
                ? `${visibleThreads.length}/${localSearchThreads.length}`
                : `${visibleThreads.length}/${localThreads.length}`
            }
            onCollapse={() => toggle("list")}
          >
            <button
              type="button"
              onClick={() => {
                setComposeOpen(true);
                setComposeStatus(null);
              }}
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              Compose
            </button>
          </PaneHeader>
          <div className="space-y-2 border-b border-[var(--color-line)] px-3 py-2">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitMailSearch();
              }}
              className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-1.5"
            >
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
                placeholder="Search all Gmail"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
              />
              {mailQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setMailQuery("");
                    if (mailFilter === "search") router.push("/inbox");
                  }}
                  className="shrink-0 text-[12px] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                disabled={!mailQuery.trim()}
                className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-panel-strong)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text)] transition hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
              >
                Search
              </button>
            </form>
            <div className="flex items-center gap-1">
              {(["focused", "all", "search"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    if (f === "search" && searchQuery) {
                      router.push(searchUrl(searchQuery, selectedId));
                      return;
                    }
                    setMailFilter(f);
                    router.push(
                      selectedId ? normalThreadUrl(selectedId, f) : listUrl(f),
                    );
                  }}
                  disabled={f === "search" && !searchQuery}
                  className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-medium capitalize transition ${
                    mailFilter === f
                      ? "bg-[var(--color-panel-strong)] text-[var(--color-text)]"
                      : "text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                  } ${f === "search" && !searchQuery ? "opacity-40" : ""}`}
                  title={
                    f === "search" && searchQuery
                      ? `Search: ${searchQuery}`
                      : undefined
                  }
                >
                  {f === "search" && searchQuery
                    ? `Search (${localSearchThreads.length})`
                    : f}
                </button>
              ))}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setMailQuery("");
                    setLocalSearchThreads([]);
                    setSearchPageToken(null);
                    router.push(
                      selectedId
                        ? normalThreadUrl(selectedId, "focused")
                        : "/inbox",
                    );
                  }}
                  className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] text-[var(--color-text-soft)] transition hover:text-[var(--color-text)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-[var(--color-line)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {visibleThreads.length === 0 && (
              <p className="px-3.5 py-4 text-[12px] text-[var(--color-text-soft)]">
                {mailQuery
                  ? "No mail matches your search."
                  : mailFilter === "search"
                    ? "No KODA search results."
                    : "No focused mail right now."}
              </p>
            )}
            {visibleThreads.map((thread) => {
              const isActive = thread.id === active?.id;
              const isHighlighted = highlightedThreadIds.has(thread.id);
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(thread.id);
                    setReplyStatus(null);
                    setHighlightedThreadIds((current) => {
                      if (!current.has(thread.id)) return current;
                      const next = new Set(current);
                      next.delete(thread.id);
                      return next;
                    });
                    router.push(
                      mailFilter === "search" && searchQuery
                        ? searchUrl(searchQuery, thread.id)
                        : normalThreadUrl(thread.id, mailFilter),
                    );
                  }}
                  className={`block w-full border-l-2 px-3.5 py-3 text-left transition ${
                    isActive
                      ? "border-l-transparent bg-[var(--color-panel-strong)]"
                      : isHighlighted
                        ? "border-l-[var(--color-accent)] bg-[var(--color-accent-soft)] hover:bg-[var(--color-panel)]"
                        : "border-l-transparent hover:bg-[var(--color-panel)]"
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
            {pageToken && !mailQuery && mailFilter !== "search" && (
              <div className="p-3">
                <button
                  type="button"
                  onClick={loadMoreMail}
                  disabled={pageBusy}
                  className="w-full rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
                >
                  {pageBusy ? "Loading..." : "Load 20 more"}
                </button>
              </div>
            )}
            {searchPageToken && mailFilter === "search" && (
              <div className="p-3">
                <button
                  type="button"
                  onClick={loadMoreSearchMail}
                  disabled={searchBusy}
                  className="w-full rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
                >
                  {searchBusy ? "Loading..." : "Load 20 more results"}
                </button>
              </div>
            )}
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
          <PaneHeader
            title="Thread"
            onCollapse={() => toggle("detail")}
          ></PaneHeader>

          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {!active ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
                <p className="kicker">No thread selected</p>
                <h2 className="mt-2 text-base font-medium text-[var(--color-text)]">
                  Select an email to preview it here.
                </h2>
                <p className="mt-2 max-w-sm text-[13px] leading-6 text-[var(--color-text-soft)]">
                  Open a thread from the mail list or run a Gmail search to read
                  messages and draft replies with KODA.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-base font-medium tracking-tight text-[var(--color-text)] sm:text-lg">
                        {active.subject}
                      </h2>
                      <p className="mt-1 text-[13px] text-[var(--color-text-soft)]">
                        {active.from}
                        {active.to ? ` · to ${active.to}` : ""} · {active.time}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={extractActiveCommitment}
                      disabled={commitmentBusy}
                      className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
                    >
                      {commitmentBusy
                        ? "Extracting..."
                        : active.commitment
                          ? "Re-extract"
                          : "Extract commitment"}
                    </button>
                  </div>
                  {commitmentStatus && (
                    <p className="mt-2 text-[12px] text-[var(--color-text-soft)]">
                      {commitmentStatus}
                    </p>
                  )}
                </div>

                <div className="space-y-3 px-4 py-5 sm:px-5">
                  {(active.messages.length
                    ? active.messages
                    : [
                        {
                          id: `${active.id}-fallback`,
                          from: active.from,
                          to: active.to ?? null,
                          body: active.body ?? active.preview,
                          preview: active.preview,
                          time: active.time,
                          receivedAt: null,
                        },
                      ]
                  ).map((message) => (
                    <article
                      key={message.id}
                      className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)]"
                    >
                      <div className="border-b border-[var(--color-line)] px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-[13px] font-medium text-[var(--color-text)]">
                            {message.from}
                          </p>
                          <span className="shrink-0 font-mono text-[10px] text-[var(--color-text-soft)]">
                            {message.time}
                          </span>
                        </div>
                        {message.to && (
                          <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-soft)]">
                            to {message.to}
                          </p>
                        )}
                      </div>
                      <div className="email-md px-3 py-3 text-[14px] leading-7 text-[var(--color-text-muted)]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.body}
                        </ReactMarkdown>
                      </div>
                    </article>
                  ))}
                </div>

                {active?.commitment && (
                  <div className="mx-4 mb-5 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3.5 sm:mx-5">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                      <p className="kicker text-[var(--color-accent)]">
                        Extracted commitment
                      </p>
                    </div>
                    <p className="mt-2.5 text-[14px] leading-6 font-medium text-[var(--color-text)]">
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
                          <dd className="truncate text-[var(--color-text-muted)]">
                            {v}
                          </dd>
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
                        onClick={() => {
                          setEventOpen(true);
                          setEventStatus(null);
                          setEventForm((current) => ({
                            ...current,
                            title: active.commitment?.title ?? current.title,
                          }));
                        }}
                        className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                      >
                        Add to calendar →
                      </button>
                    </div>
                  </div>
                )}
                <div className="mx-4 mb-5 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3 sm:mx-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="kicker">Reply from KODA</p>
                    <button
                      type="button"
                      onClick={draftReplyWithAi}
                      disabled={draftBusy || replyBusy}
                      title="Draft reply using AI"
                      className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
                    >
                      {draftBusy ? "Drafting..." : "AI draft"}
                    </button>
                  </div>
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Write a reply..."
                    rows={5}
                    className="mt-3 max-h-44 min-h-28 w-full resize-none overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] leading-6 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
                  />
                  <div className="mt-2 min-h-5">
                    {replyStatus && (
                      <p className="truncate text-[12px] text-[var(--color-text-soft)]">
                        {replyStatus}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={sendReply}
                      disabled={replyBusy || !replyText.trim()}
                      className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium whitespace-nowrap text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
                    >
                      {replyBusy ? "Sending..." : "Send reply"}
                    </button>
                    {replyText && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyText("");
                          setReplyStatus(null);
                        }}
                        disabled={replyBusy || draftBusy}
                        className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </>
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
            count={now.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
            onCollapse={() => toggle("calendar")}
          >
            <button
              type="button"
              onClick={() => {
                setEventOpen((open) => {
                  const next = !open;
                  if (next) setEventForm(defaultQuickEvent(now));
                  return next;
                });
                setEventStatus(null);
              }}
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
              {eventOpen && (
                <QuickEventComposer
                  form={eventForm}
                  setForm={setEventForm}
                  busy={eventBusy}
                  status={eventStatus}
                  onCreate={createQuickEvent}
                />
              )}

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
                          {d.toLocaleDateString("en-US", { weekday: "short" })}{" "}
                          · {item.allDay ? "All day" : fmtTime(d)}
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

      {composeOpen && (
        <div className="fixed right-4 bottom-24 z-40 w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-panel-elevated)] shadow-[var(--shadow-soft)] lg:bottom-20">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2">
            <p className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-text)] uppercase">
              New message
            </p>
            <button
              type="button"
              onClick={() => {
                setComposeOpen(false);
                setComposeStatus(null);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
            >
              ✕
            </button>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            <input
              value={composeForm.to}
              onChange={(event) =>
                setComposeForm((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
              placeholder="Recipients"
              className="w-full bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
            />
            <input
              value={composeForm.subject}
              onChange={(event) =>
                setComposeForm((current) => ({
                  ...current,
                  subject: event.target.value,
                }))
              }
              placeholder="Subject"
              className="w-full bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
            />
          </div>
          <textarea
            value={composeForm.body}
            onChange={(event) =>
              setComposeForm((current) => ({
                ...current,
                body: event.target.value,
              }))
            }
            rows={9}
            placeholder="Write your email..."
            className="w-full resize-none bg-transparent px-3 py-3 text-[13px] leading-6 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
          />
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] px-3 py-2">
            <button
              type="button"
              onClick={sendCompose}
              disabled={
                composeBusy ||
                parseRecipients(composeForm.to).length === 0 ||
                !composeForm.subject.trim() ||
                !composeForm.body.trim()
              }
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {composeBusy ? "Sending..." : "Send"}
            </button>
            {composeStatus && (
              <p className="text-right text-[12px] text-[var(--color-text-soft)]">
                {composeStatus}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
