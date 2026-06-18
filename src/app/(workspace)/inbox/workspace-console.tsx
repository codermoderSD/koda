"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { DictationButton } from "../_components/dictation-button";
import { ResizeHandle, usePaneWidths } from "../_components/resizable-panes";
import { KodaLogo } from "../../_components/koda-logo";
import type { CalEvent } from "../calendar/calendar-view";
import type { GmailDraftSummary } from "~/server/koda/gmail-actions";
import type { EmailAlias } from "~/server/koda/aliases";

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

type ThreadImageAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  dataUrl: string;
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
  attachments?: ThreadImageAttachment[];
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

type ComposeAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
  previewUrl: string;
  size: number;
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

const MAX_COMPOSE_IMAGES = 4;
const MAX_COMPOSE_IMAGE_BYTES = 5 * 1024 * 1024;

type FreeSlot = {
  start: string;
  end: string;
  localStart: string;
  localEnd: string;
  label: string;
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

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image."));
    };
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
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
      <div className="relative mt-2">
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
          className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-2 pr-11 text-[13px] leading-5 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
        />
        <DictationButton
          value={form.description}
          onChange={(value) =>
            setForm((current) => ({ ...current, description: value }))
          }
          onSubmit={onCreate}
          disabled={busy}
          className="absolute top-2 right-2"
        />
      </div>
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

function extractHeaderEmail(value: string | null | undefined) {
  if (!value) return null;
  const match = /<([^>]+)>/.exec(value);
  const email = (match?.[1] ?? value.split(/\s+/).at(-1) ?? value)
    .replace(/[<>"']/g, "")
    .trim()
    .toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function splitHeaderEmails(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((part) => extractHeaderEmail(part))
    .filter((email): email is string => Boolean(email));
}

function cleanSubjectForMeeting(subject: string) {
  return subject.replace(/^(\s*(re|fwd):\s*)+/i, "").trim() || "Meeting";
}

function senderDisplayName(value: string | null | undefined) {
  if (!value) return "";
  const quoted = /^\s*"?([^"<]+?)"?\s*</.exec(value);
  const name = quoted?.[1]?.trim();
  if (name) return name;
  return value.replace(/[<>]/g, "").trim();
}

function senderInitials(value: string | null | undefined) {
  const name = senderDisplayName(value);
  const letters = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

function chooseThreadCounterparty(thread: Thread) {
  const firstFrom = extractHeaderEmail(thread.messages.at(0)?.from);
  const lastFrom = extractHeaderEmail(thread.messages.at(-1)?.from);
  if (firstFrom && lastFrom && firstFrom !== lastFrom) return firstFrom;

  const emails = thread.messages.flatMap((message) => [
    ...splitHeaderEmails(message.from),
    ...splitHeaderEmails(message.to),
  ]);
  const unique = [...new Set(emails)];
  return unique.find((email) => email !== lastFrom) ?? unique[0] ?? null;
}

function threadMeetingDescription(thread: Thread) {
  const latest = thread.messages.at(-1);
  return [
    `Scheduled from Gmail thread: ${thread.subject}`,
    latest?.body ? `Latest message: ${latest.body.slice(0, 600)}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function AliasToField({
  value,
  disabled,
  aliases,
  onChange,
  onAliasCreated,
}: {
  value: string;
  disabled?: boolean;
  aliases: EmailAlias[];
  onChange: (val: string) => void;
  onAliasCreated: (a: EmailAlias) => void;
}) {
  const [addFor, setAddFor] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const atMatch = /(?:^|[\s,])(@[a-zA-Z0-9_-]*)$/.exec(value);
  const currentAt = atMatch?.[1] ?? null;
  const handle = currentAt?.slice(1).toLowerCase() ?? "";
  const suggestions = handle
    ? aliases.filter((a) => a.alias.startsWith(handle))
    : [];
  const exactMatch = aliases.find((a) => a.alias === handle);
  const showDropdown = !!currentAt && handle.length > 0;

  function pickSuggestion(alias: EmailAlias) {
    const replaced = value.replace(/(@[a-zA-Z0-9_-]*)$/, alias.email);
    onChange(replaced.endsWith(",") ? replaced + " " : replaced + ", ");
    setAddFor(null);
  }

  async function saveAlias() {
    if (!addFor || !addEmail.trim()) return;
    setAddBusy(true);
    try {
      const res = await fetch("/api/koda/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: addFor.replace(/^@/, ""),
          email: addEmail.trim(),
          label: addLabel.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Could not save alias.");
      const data = (await res.json()) as { alias: EmailAlias };
      onAliasCreated(data.alias);
      pickSuggestion(data.alias);
      setAddFor(null);
      setAddEmail("");
      setAddLabel("");
    } catch (error) {
      void error;
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <div className="relative">
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setAddFor(null);
        }}
        placeholder="Recipients (or @alias)"
        className="w-full bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)] disabled:opacity-60"
      />
      {showDropdown && (
        <div className="absolute top-full left-0 z-50 mt-0.5 w-full overflow-hidden rounded-[var(--radius)] border border-[var(--color-line-strong)] bg-[var(--color-panel-elevated)] shadow-[var(--shadow-soft)]">
          {suggestions.length > 0 ? (
            suggestions.slice(0, 5).map((a) => (
              <button
                key={a.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickSuggestion(a);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-[var(--color-panel)]"
              >
                <span className="font-mono text-[11px] text-[var(--color-accent)]">
                  @{a.alias}
                </span>
                <span className="truncate text-[12px] text-[var(--color-text-muted)]">
                  {a.label ? `${a.label} · ${a.email}` : a.email}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2">
              <p className="text-[12px] text-[var(--color-text-soft)]">
                No alias for{" "}
                <span className="font-mono text-[var(--color-accent)]">
                  {currentAt}
                </span>
              </p>
              {addFor === currentAt ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <input
                    autoFocus
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="Email address"
                    className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1 text-[12px] text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
                  />
                  <input
                    value={addLabel}
                    onChange={(e) => setAddLabel(e.target.value)}
                    placeholder="Display name (optional)"
                    className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1 text-[12px] text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void saveAlias()}
                      disabled={addBusy || !addEmail.trim()}
                      className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-60"
                    >
                      {addBusy ? "Saving…" : "Save alias"}
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setAddFor(null)}
                      className="px-2 py-0.5 text-[11px] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setAddFor(currentAt);
                    setAddEmail("");
                    setAddLabel("");
                  }}
                  className="mt-1.5 text-[12px] text-[var(--color-accent)] underline-offset-2 hover:underline"
                >
                  + Add alias for {currentAt}
                </button>
              )}
            </div>
          )}
          {!exactMatch && suggestions.length > 0 && (
            <div className="border-t border-[var(--color-line)] px-3 py-1.5">
              {addFor === currentAt ? (
                <div className="flex flex-col gap-1.5 py-1">
                  <input
                    autoFocus
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="Email address"
                    className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1 text-[12px] text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
                  />
                  <input
                    value={addLabel}
                    onChange={(e) => setAddLabel(e.target.value)}
                    placeholder="Display name (optional)"
                    className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1 text-[12px] text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void saveAlias()}
                      disabled={addBusy || !addEmail.trim()}
                      className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-60"
                    >
                      {addBusy ? "Saving…" : "Save alias"}
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setAddFor(null)}
                      className="px-2 py-0.5 text-[11px] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setAddFor(currentAt);
                    setAddEmail("");
                    setAddLabel("");
                  }}
                  className="text-[11px] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                >
                  + Create new alias for {currentAt}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DraftRow({
  draft,
  onSent,
  onDeleted,
}: {
  draft: GmailDraftSummary;
  onSent: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [to, setTo] = useState(draft.to.join(", "));
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/koda/gmail/drafts/${encodeURIComponent(draft.id)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: to
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            subject,
            body,
          }),
        },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Could not send draft.");
      }
      onSent(draft.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send draft.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft() {
    setBusy(true);
    try {
      await fetch(`/api/koda/gmail/drafts/${encodeURIComponent(draft.id)}`, {
        method: "DELETE",
      });
      onDeleted(draft.id);
    } catch (error) {
      void error;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-[var(--color-line)] px-3.5 py-3">
      <div className="mb-2 flex items-center gap-1">
        <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-accent)] uppercase">
          Draft
        </span>
      </div>
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="To"
        className="mb-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
      />
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="mb-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        {err && <p className="text-[11px] text-[var(--color-danger)]">{err}</p>}
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => void deleteDraft()}
            disabled={busy}
            className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] text-[var(--color-text-soft)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:opacity-60"
          >
            {busy ? "…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy}
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaneHeader({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
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
      {children && <div className="flex items-center gap-1">{children}</div>}
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
  initialTab?: "focused" | "all" | "search" | "drafts";
  events: CalEvent[];
  nowISO: string;
  selectedThreadId?: string;
}) {
  const router = useRouter();
  const [localThreads, setLocalThreads] = useState(threads);
  const [pageToken, setPageToken] = useState(nextPageToken);
  const [pageBusy, setPageBusy] = useState(false);
  const knownThreadIdsRef = useRef(new Set(threads.map((thread) => thread.id)));
  const refreshRequestedRef = useRef(false);
  const [highlightedThreadIds, setHighlightedThreadIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(
    selectedThreadId,
  );
  const [mailQuery, setMailQuery] = useState(searchQuery);
  const [mailFilter, setMailFilter] = useState<
    "focused" | "all" | "search" | "drafts"
  >(
    initialTab === "search" && searchQuery
      ? "search"
      : (initialTab ?? "focused"),
  );
  const [localDrafts, setLocalDrafts] = useState<GmailDraftSummary[]>([]);
  const [draftsBusy, setDraftsBusy] = useState(false);
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [localSearchThreads, setLocalSearchThreads] = useState(searchThreads);
  const [searchPageToken, setSearchPageToken] = useState(searchNextPageToken);
  const [searchBusy, setSearchBusy] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState<ComposeForm>(() =>
    defaultCompose(),
  );
  const [composeStatus, setComposeStatus] = useState<string | null>(null);
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeDraftBusy, setComposeDraftBusy] = useState(false);
  const [composeAttachments, setComposeAttachments] = useState<
    ComposeAttachment[]
  >([]);
  const composeAttachmentsRef = useRef<ComposeAttachment[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<string | null>(null);
  const [replyBusy, setReplyBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [commitmentBusy, setCommitmentBusy] = useState(false);
  const [commitmentStatus, setCommitmentStatus] = useState<string | null>(null);
  const [scheduleSlots, setScheduleSlots] = useState<FreeSlot[]>([]);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState<QuickEventForm>(() =>
    defaultQuickEvent(new Date(nowISO)),
  );
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [eventBusy, setEventBusy] = useState(false);
  const [localEvents, setLocalEvents] = useState(events);
  const [calRef, setCalRef] = useState<Date>(() => new Date(nowISO));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const paneContainerRef = useRef<HTMLDivElement>(null);
  const { widths, adjust } = usePaneWidths();

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
  }, [threads, nextPageToken]);

  useEffect(() => {
    setSelectedId(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    setScheduleSlots([]);
    setScheduleStatus(null);
    setCommitmentStatus(null);
  }, [selectedId]);

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
    fetch("/api/koda/aliases")
      .then((r) => r.json())
      .then((data: { aliases?: EmailAlias[] }) =>
        setAliases(data.aliases ?? []),
      )
      .catch((e) => {
        console.error("Could not fetch aliases", e);
      });
  }, []);

  useEffect(() => {
    if (mailFilter !== "drafts") return;
    setDraftsBusy(true);
    fetch("/api/koda/gmail/drafts")
      .then((r) => r.json())
      .then((data: { drafts?: GmailDraftSummary[] }) => {
        setLocalDrafts(data.drafts ?? []);
      })
      .catch(() => setLocalDrafts([]))
      .finally(() => setDraftsBusy(false));
  }, [mailFilter]);

  useEffect(() => {
    composeAttachmentsRef.current = composeAttachments;
  }, [composeAttachments]);

  useEffect(
    () => () => {
      composeAttachmentsRef.current.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl);
      });
    },
    [],
  );

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
    const start = startOfWeek(calRef);
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
        full: day,
        dots: Math.min(dots, 3),
        today: startOfDay(day).getTime() === startOfDay(now).getTime(),
        selected: selectedDay
          ? startOfDay(day).getTime() === startOfDay(selectedDay).getTime()
          : false,
      };
    });
  }, [localEvents, now, calRef, selectedDay]);

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

  const dayAgenda = useMemo(() => {
    if (!selectedDay) return null;
    const key = startOfDay(selectedDay).getTime();
    return localEvents
      .filter((e) => {
        if (!e.start) return false;
        const d = new Date(e.start);
        return !Number.isNaN(d.getTime()) && startOfDay(d).getTime() === key;
      })
      .sort(
        (a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime(),
      );
  }, [localEvents, selectedDay]);

  function shiftWeek(dir: -1 | 1) {
    setCalRef((r) => addDays(r, dir * 7));
  }

  function resetCalendarToToday() {
    setCalRef(new Date(nowISO));
    setSelectedDay(null);
  }

  function toggleSelectedDay(day: Date) {
    setSelectedDay((current) =>
      current && startOfDay(current).getTime() === startOfDay(day).getTime()
        ? null
        : day,
    );
  }

  function resolveAliasesInText(value: string) {
    return value.replace(/@([a-zA-Z0-9_-]+)/g, (match, handle: string) => {
      const found = aliases.find((a) => a.alias === handle.toLowerCase());
      return found ? found.email : match;
    });
  }

  function parseRecipients(value: string) {
    return resolveAliasesInText(value)
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
  }

  function composeAttachmentPayload() {
    return composeAttachments.map(({ filename, mimeType, data }) => ({
      filename,
      mimeType,
      data,
    }));
  }

  function clearComposeAttachments() {
    setComposeAttachments((current) => {
      current.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl);
      });
      return [];
    });
  }

  function removeComposeAttachment(id: string) {
    setComposeAttachments((current) => {
      const attachment = current.find((item) => item.id === id);
      if (attachment) URL.revokeObjectURL(attachment.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  async function addComposeImages(files: FileList | null) {
    if (!files?.length) return;
    const availableSlots = MAX_COMPOSE_IMAGES - composeAttachments.length;
    if (availableSlots <= 0) {
      setComposeStatus(`You can attach up to ${MAX_COMPOSE_IMAGES} images.`);
      return;
    }

    const images = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, availableSlots);
    const tooLarge = images.find((file) => file.size > MAX_COMPOSE_IMAGE_BYTES);
    if (tooLarge) {
      setComposeStatus(`${tooLarge.name} is larger than 5 MB.`);
      return;
    }
    if (images.length === 0) {
      setComposeStatus("Choose an image file to attach.");
      return;
    }

    try {
      const attachments = await Promise.all(
        images.map(async (file) => ({
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          data: await fileToDataUrl(file),
          previewUrl: URL.createObjectURL(file),
          size: file.size,
        })),
      );
      setComposeAttachments((current) => [...current, ...attachments]);
      setComposeStatus(null);
    } catch (error) {
      setComposeStatus(
        error instanceof Error ? error.message : "Could not attach image.",
      );
    }
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

  function tabParam(tab: "focused" | "all" | "search" | "drafts") {
    if (tab === "all") return "?tab=all";
    if (tab === "drafts") return "?tab=drafts";
    return "";
  }

  function listUrl(tab: "focused" | "all" | "search" | "drafts") {
    if (tab === "search" && searchQuery) return searchUrl(searchQuery);
    return `/inbox${tabParam(tab)}`;
  }

  function normalThreadUrl(
    threadId: string,
    tab: "focused" | "all" | "search" | "drafts" = mailFilter,
  ) {
    if (tab === "drafts") return listUrl("drafts");
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
      attachments?: ThreadImageAttachment[];
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
        attachments: message.attachments ?? [],
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

  async function suggestScheduleSlots() {
    if (!active) return;
    const attendee = chooseThreadCounterparty(active);
    if (!attendee) {
      setScheduleStatus("Could not determine who to invite from this thread.");
      return;
    }

    setScheduleBusy(true);
    setScheduleStatus(null);
    setScheduleSlots([]);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const payload = await readJson<{ slots: FreeSlot[] }>(
        await fetch("/api/koda/calendar/free-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationMinutes: 30,
            horizonDays: 7,
            timeZone,
            maxResults: 3,
          }),
        }),
      );
      setScheduleSlots(payload.slots);
      setScheduleStatus(
        payload.slots.length > 0
          ? `Pick a time to invite ${attendee}.`
          : "No free 30-minute slots found this week.",
      );
    } catch (error) {
      setScheduleStatus(
        error instanceof Error ? error.message : "Could not find free slots.",
      );
    } finally {
      setScheduleBusy(false);
    }
  }

  async function scheduleThreadMeeting(slot: FreeSlot) {
    if (!active) return;
    const attendee = chooseThreadCounterparty(active);
    if (!attendee) {
      setScheduleStatus("Could not determine who to invite from this thread.");
      return;
    }

    setScheduleBusy(true);
    setScheduleStatus(null);
    try {
      const title = `Meeting: ${cleanSubjectForMeeting(active.subject)}`;
      const payload = await readJson<{ event: CalEvent }>(
        await fetch("/api/koda/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            start: slot.localStart,
            end: slot.localEnd,
            attendees: [attendee],
            description: threadMeetingDescription(active),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            sendUpdates: "all",
          }),
        }),
      );
      setLocalEvents((current) => [...current, payload.event]);
      setScheduleSlots([]);
      setScheduleStatus(`Created ${title} for ${slot.label}.`);
      setReplyText(
        [
          `I scheduled a 30-minute meeting for ${slot.label}.`,
          "I sent the calendar invite as well.",
          "",
          "Looking forward to discussing this.",
        ].join("\n"),
      );
      setReplyStatus(`Drafted a reply to ${attendee}. Review before sending.`);
      window.dispatchEvent(new Event("koda:data-refresh"));
    } catch (error) {
      setScheduleStatus(
        error instanceof Error
          ? error.message
          : "Could not schedule this meeting.",
      );
    } finally {
      setScheduleBusy(false);
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
            attachments: composeAttachmentPayload(),
          }),
        }),
      );
      const threadId = payload.message.threadId ?? `sent-${Date.now()}`;
      const sentAttachments = composeAttachments.map((attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        dataUrl: attachment.data,
      }));
      const sentMessage: ThreadMessage = {
        id: payload.message.id ?? `${threadId}-message`,
        from: payload.message.from,
        to: payload.message.to.join(", "),
        body: payload.message.body,
        preview: payload.message.body,
        time: formatThreadTime(payload.message.sentAt),
        receivedAt: payload.message.sentAt,
        attachments: sentAttachments,
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
      clearComposeAttachments();
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

  async function saveComposeDraft() {
    setComposeDraftBusy(true);
    setComposeStatus(null);
    try {
      const payload = await readJson<{
        draft: {
          id: string | null;
          messageId: string | null;
          threadId: string | null;
          savedAt: string;
        };
      }>(
        await fetch("/api/koda/gmail/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: parseRecipients(composeForm.to),
            subject: composeForm.subject,
            body: composeForm.body,
            attachments: composeAttachmentPayload(),
          }),
        }),
      );
      setComposeStatus(
        payload.draft.id
          ? `Draft saved to Gmail at ${formatThreadTime(payload.draft.savedAt)}.`
          : "Draft saved to Gmail.",
      );
    } catch (error) {
      setComposeStatus(
        error instanceof Error ? error.message : "Could not save draft.",
      );
    } finally {
      setComposeDraftBusy(false);
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

  const adjustPct = (
    key: "mail" | "calendarOpen" | "calendarClosed",
    deltaPx: number,
  ) => {
    const width = paneContainerRef.current?.clientWidth ?? 0;
    if (width > 0) adjust(key, (deltaPx / width) * 100);
  };

  const mailBasisStyle = { "--pane-basis": `${widths.mail}%` } as CSSProperties;
  const calendarBasisStyle = {
    "--pane-basis": `${active ? widths.calendarOpen : widths.calendarClosed}%`,
  } as CSSProperties;

  return (
    <div
      ref={paneContainerRef}
      className="flex w-full flex-col gap-3 lg:h-full lg:min-h-0 lg:flex-row"
    >
      <section
        style={active ? mailBasisStyle : undefined}
        className={`flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] lg:min-h-0 ${
          active ? "lg:shrink-0 lg:grow-0 lg:basis-(--pane-basis)" : "lg:flex-1"
        }`}
      >
        <PaneHeader
          title="Mail"
          count={
            mailFilter === "search"
              ? `${visibleThreads.length}/${localSearchThreads.length}`
              : `${visibleThreads.length}/${localThreads.length}`
          }
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
                aria-label="Clear search"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel-strong)] hover:text-[var(--color-text)]"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
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
            {(["focused", "all", "drafts", "search"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  if (f === "search" && searchQuery) {
                    router.push(searchUrl(searchQuery, selectedId));
                    return;
                  }
                  setMailFilter(f);
                  router.push(listUrl(f));
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
                  : f === "drafts" && localDrafts.length > 0
                    ? `Drafts (${localDrafts.length})`
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
          {mailFilter === "drafts" ? (
            draftsBusy ? (
              <p className="px-3.5 py-4 text-[12px] text-[var(--color-text-soft)]">
                Loading drafts…
              </p>
            ) : localDrafts.length === 0 ? (
              <p className="px-3.5 py-4 text-[12px] text-[var(--color-text-soft)]">
                No drafts in Gmail.
              </p>
            ) : (
              localDrafts.map((d) => (
                <DraftRow
                  key={d.id}
                  draft={d}
                  onSent={(id) =>
                    setLocalDrafts((prev) => prev.filter((x) => x.id !== id))
                  }
                  onDeleted={(id) =>
                    setLocalDrafts((prev) => prev.filter((x) => x.id !== id))
                  }
                />
              ))
            )
          ) : (
            <>
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
                    className={`flex w-full gap-3 border-l-2 px-3.5 py-3 text-left transition ${
                      isActive
                        ? "border-l-transparent bg-[var(--color-panel-strong)]"
                        : isHighlighted
                          ? "border-l-[var(--color-accent)] bg-[var(--color-accent-soft)] hover:bg-[var(--color-panel)]"
                          : "border-l-transparent hover:bg-[var(--color-panel)]"
                    }`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel-strong)] font-mono text-[11px] font-medium text-[var(--color-text-muted)]">
                      {senderInitials(thread.from)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-medium text-[var(--color-text)]">
                          {senderDisplayName(thread.from) || thread.from}
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
            </>
          )}
        </div>
      </section>

      {active && (
        <ResizeHandle
          ariaLabel="Resize mail pane"
          onResize={(dx) => adjustPct("mail", dx)}
        />
      )}

      {active && (
        <section className="flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] lg:min-h-0 lg:flex-1">
          <PaneHeader title="Thread">
            <button
              type="button"
              onClick={() => {
                setSelectedId(undefined);
                router.push(listUrl(mailFilter));
              }}
              aria-label="Close thread"
              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
            >
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </PaneHeader>

          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {!active ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-text-soft)]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 13l2.5-7A2 2 0 0 1 7.4 4.6h9.2a2 2 0 0 1 1.9 1.4L21 13" />
                    <path d="M3 13h5l1.5 2.5h5L16 13h5v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </span>
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
                <div className="border-b border-[var(--color-line)] px-4 py-3.5 sm:px-5">
                  <h2 className="line-clamp-2 text-[15px] leading-snug font-medium tracking-tight text-[var(--color-text)]">
                    {active.subject}
                  </h2>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="min-w-0 truncate text-[12px] text-[var(--color-text-soft)]">
                      {active.from}
                      {active.to ? ` · to ${active.to}` : ""} · {active.time}
                    </p>
                    {(() => {
                      const senderEmail = extractHeaderEmail(active.from);
                      const alreadyAliased = aliases.some(
                        (a) => a.email === senderEmail,
                      );
                      if (alreadyAliased || !senderEmail) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const handle = senderEmail.split("@")[0] ?? "";
                            void fetch("/api/koda/aliases", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                alias: handle,
                                email: senderEmail,
                                label:
                                  senderDisplayName(active.from) ?? undefined,
                              }),
                            })
                              .then((r) => r.json())
                              .then(
                                (data: {
                                  alias?: EmailAlias;
                                  error?: string;
                                }) => {
                                  if (data.alias)
                                    setAliases((prev) => [
                                      ...prev,
                                      data.alias!,
                                    ]);
                                },
                              )
                              // eslint-disable-next-line @typescript-eslint/no-empty-function
                              .catch(() => {});
                          }}
                          className="shrink-0 font-mono text-[10px] tracking-[0.06em] text-[var(--color-accent)] uppercase transition hover:underline"
                        >
                          + alias
                        </button>
                      );
                    })()}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={suggestScheduleSlots}
                      disabled={scheduleBusy}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
                    >
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
                      {scheduleBusy ? "Checking…" : "Schedule"}
                    </button>
                    <button
                      type="button"
                      onClick={extractActiveCommitment}
                      disabled={commitmentBusy}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
                    >
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
                      {commitmentBusy
                        ? "Extracting…"
                        : active.commitment
                          ? "Re-extract"
                          : "Extract"}
                    </button>
                  </div>
                  {scheduleStatus && (
                    <p className="mt-2 text-[12px] text-[var(--color-text-soft)]">
                      {scheduleStatus}
                    </p>
                  )}
                  {scheduleSlots.length > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {scheduleSlots.map((slot) => (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => void scheduleThreadMeeting(slot)}
                          disabled={scheduleBusy}
                          className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-left transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] disabled:opacity-60"
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
                          attachments: [],
                        },
                      ]
                  ).map((message) => (
                    <article
                      key={message.id}
                      className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)]"
                    >
                      <div className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-3 py-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel-strong)] font-mono text-[10px] font-medium text-[var(--color-text-muted)]">
                          {senderInitials(message.from)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-[13px] font-medium text-[var(--color-text)]">
                              {senderDisplayName(message.from) || message.from}
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
                      </div>
                      <div className="email-md px-3 py-3 text-[14px] leading-7 text-[var(--color-text-muted)]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.body}
                        </ReactMarkdown>
                        {message.attachments &&
                          message.attachments.length > 0 && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {message.attachments.map((attachment) => (
                                <figure
                                  key={attachment.id}
                                  className="overflow-hidden rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface-2)]"
                                >
                                  <Image
                                    src={attachment.dataUrl}
                                    alt={attachment.filename}
                                    width={640}
                                    height={320}
                                    unoptimized
                                    className="max-h-80 w-full object-contain"
                                  />
                                  <figcaption className="truncate border-t border-[var(--color-line)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-soft)]">
                                    {attachment.filename}
                                  </figcaption>
                                </figure>
                              ))}
                            </div>
                          )}
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
                    <div className="flex items-center gap-2">
                      <KodaLogo markClassName="h-4 w-4" />
                      <p className="kicker">Reply</p>
                    </div>
                    <button
                      type="button"
                      onClick={draftReplyWithAi}
                      disabled={draftBusy || replyBusy}
                      title="Draft reply using AI"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M8 1.5l1.4 3.4L12.8 6 9.4 7.4 8 10.8 6.6 7.4 3.2 6l3.4-1.1z" />
                      </svg>
                      {draftBusy ? "Drafting…" : "AI draft"}
                    </button>
                  </div>
                  <div className="relative mt-3">
                    <textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      placeholder="Write a reply..."
                      rows={5}
                      className="max-h-44 min-h-28 w-full resize-none overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 pr-12 text-[13px] leading-6 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
                    />
                    <DictationButton
                      value={replyText}
                      onChange={setReplyText}
                      onSubmit={() => {
                        if (!replyBusy && replyText.trim()) void sendReply();
                      }}
                      disabled={replyBusy || draftBusy}
                      className="absolute top-2 right-2"
                    />
                  </div>
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

      <ResizeHandle
        ariaLabel="Resize calendar pane"
        onResize={(dx) =>
          adjustPct(active ? "calendarOpen" : "calendarClosed", -dx)
        }
      />

      <section
        style={calendarBasisStyle}
        className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] lg:min-h-0 lg:shrink-0 lg:grow-0 lg:basis-(--pane-basis)"
      >
        <PaneHeader
          title="Calendar"
          count={startOfWeek(calRef).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
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
          <div className="grid grid-cols-7 gap-1 border-b border-[var(--color-line)] p-3">
            {weekStrip.map((d) => (
              <button
                type="button"
                key={d.full.toISOString()}
                onClick={() => toggleSelectedDay(d.full)}
                className={`flex flex-col items-center gap-1 rounded-[var(--radius)] py-2 transition ${
                  d.selected
                    ? "bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]"
                    : d.today
                      ? "bg-[var(--color-panel-strong)] hover:bg-[var(--color-panel)]"
                      : "hover:bg-[var(--color-panel)]"
                }`}
              >
                <span className="font-mono text-[10px] text-[var(--color-text-soft)]">
                  {d.label}
                </span>
                <span
                  className={`text-[13px] font-medium ${
                    d.today || d.selected
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
              </button>
            ))}
          </div>

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

            <div className="mb-1 flex items-center justify-between px-1">
              <p className="kicker">
                {selectedDay
                  ? selectedDay.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "Up next"}
              </p>
              {selectedDay && (
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-text-soft)] uppercase transition hover:text-[var(--color-text)]"
                >
                  Upcoming
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {(selectedDay ? (dayAgenda ?? []) : agenda).length === 0 && (
                <p className="px-2 py-2 text-[13px] text-[var(--color-text-soft)]">
                  {selectedDay
                    ? "No events on this day."
                    : "Nothing scheduled ahead."}
                </p>
              )}
              {(selectedDay ? (dayAgenda ?? []) : agenda).map((item) => {
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

        <div className="flex items-center justify-center gap-2 border-t border-[var(--color-line)] px-3 py-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            aria-label="Previous week"
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={resetCalendarToToday}
            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-1 text-[11px] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            aria-label="Next week"
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
          >
            ›
          </button>
        </div>
      </section>

      {composeOpen && (
        <div className="pop fixed right-4 bottom-24 z-40 w-[min(420px,calc(100vw-32px))] rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-panel-elevated)] shadow-[var(--shadow-soft)] lg:bottom-20">
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
              aria-label="Close compose"
              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
            >
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            <AliasToField
              value={composeForm.to}
              disabled={composeBusy || composeDraftBusy}
              aliases={aliases}
              onChange={(val) =>
                setComposeForm((current) => ({ ...current, to: val }))
              }
              onAliasCreated={(a) => setAliases((prev) => [...prev, a])}
            />
            <input
              value={composeForm.subject}
              disabled={composeBusy || composeDraftBusy}
              onChange={(event) =>
                setComposeForm((current) => ({
                  ...current,
                  subject: event.target.value,
                }))
              }
              placeholder="Subject"
              className="w-full bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)] disabled:opacity-60"
            />
          </div>
          <div className="relative">
            <textarea
              value={composeForm.body}
              disabled={composeBusy || composeDraftBusy}
              onChange={(event) =>
                setComposeForm((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              rows={9}
              placeholder="Write your email..."
              className="w-full resize-none bg-transparent px-3 py-3 pr-12 text-[13px] leading-6 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)] disabled:opacity-60"
            />
            <DictationButton
              value={composeForm.body}
              onChange={(value) =>
                setComposeForm((current) => ({ ...current, body: value }))
              }
              onSubmit={() => {
                if (
                  !composeBusy &&
                  !composeDraftBusy &&
                  parseRecipients(composeForm.to).length > 0 &&
                  composeForm.subject.trim() &&
                  composeForm.body.trim()
                ) {
                  void sendCompose();
                }
              }}
              disabled={composeBusy || composeDraftBusy}
              className="absolute top-3 right-2"
            />
          </div>
          {composeAttachments.length > 0 && (
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-line)] px-3 py-2">
              {composeAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="group relative overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)]"
                >
                  <Image
                    src={attachment.previewUrl}
                    alt=""
                    width={320}
                    height={96}
                    unoptimized
                    className="h-24 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-[var(--color-text)]">
                        {attachment.filename}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--color-text-soft)]">
                        {formatBytes(attachment.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeComposeAttachment(attachment.id)}
                      disabled={composeBusy || composeDraftBusy}
                      aria-label={`Remove ${attachment.filename}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)] disabled:opacity-50"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      >
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] px-3 py-2">
            <div className="flex items-center gap-2">
              <label
                className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)] ${
                  composeBusy || composeDraftBusy
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }`}
                title="Attach image"
                aria-label="Attach image"
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={composeBusy || composeDraftBusy}
                  onChange={(event) => {
                    void addComposeImages(event.target.files);
                    event.target.value = "";
                  }}
                />
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 11.5l2.7-2.7a1 1 0 011.4 0l1.4 1.4 2-2a1 1 0 011.4 0L13 9.3" />
                  <path d="M3 4.5A1.5 1.5 0 014.5 3h7A1.5 1.5 0 0113 4.5v7a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 11.5v-7z" />
                  <path d="M6 6.2h.01" />
                </svg>
              </label>
              {composeStatus && (
                <p className="max-w-[210px] text-[12px] text-[var(--color-text-soft)]">
                  {composeStatus}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveComposeDraft}
                disabled={
                  composeBusy ||
                  composeDraftBusy ||
                  parseRecipients(composeForm.to).length === 0 ||
                  !composeForm.subject.trim() ||
                  !composeForm.body.trim()
                }
                className="rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)] disabled:opacity-50"
              >
                {composeDraftBusy ? "Saving..." : "Save draft"}
              </button>
              <button
                type="button"
                onClick={sendCompose}
                disabled={
                  composeBusy ||
                  composeDraftBusy ||
                  parseRecipients(composeForm.to).length === 0 ||
                  !composeForm.subject.trim() ||
                  !composeForm.body.trim()
                }
                className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
              >
                {composeBusy ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
