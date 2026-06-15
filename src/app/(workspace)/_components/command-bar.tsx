"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ActiveThreadContext = {
  id: string;
  subject: string;
  from: string;
  to?: string | null;
  messages: Array<{
    from: string;
    to?: string | null;
    body: string;
    time: string;
  }>;
};

type ChatResponse = {
  status?: "success" | "needs_input" | "requires_confirmation" | "error";
  message?: string;
  retainPrompt?: boolean;
  refresh?: Array<"inbox" | "calendar">;
  components?: KodaResponseComponent[];
  error?: string;
};

type ThreadSummary = {
  id: string;
  from: string;
  to: string | null;
  subject: string;
  preview: string;
  time: string | null;
  priority: string;
  messages: Array<{
    id: string;
    from: string;
    to: string | null;
    body: string;
    preview: string;
    time: string | null;
    receivedAt: string | null;
  }>;
};

type EventSummary = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
};

type ConfirmableAction =
  | { type: "delete_event"; eventId: string }
  | { type: "send_reply"; threadId: string; body: string };

type KodaResponseComponent =
  | { type: "text"; text: string }
  | { type: "email_results"; query: string; threads: ThreadSummary[] }
  | {
      type: "event_results";
      query: string;
      events: EventSummary[];
      selection: "single" | "multi";
      intent: "delete" | "edit" | "inspect";
    }
  | {
      type: "draft_reply";
      threadId: string;
      subject: string;
      to: string;
      body: string;
    }
  | { type: "confirm_action"; label: string; action: ConfirmableAction }
  | { type: "input"; label: string; name: string; placeholder?: string };

export function CommandBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [activeThread, setActiveThread] = useState<ActiveThreadContext | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const popupOpen = Boolean(response);
  const inlineInputActive = Boolean(
    response?.components?.some((component) => component.type === "input"),
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setResponse(null);
      }
    }
    function onOpen() {
      inputRef.current?.focus();
    }
    function onActiveThread(event: Event) {
      const detail = (event as CustomEvent<ActiveThreadContext | null>).detail;
      setActiveThread(detail ?? null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("koda:command-open", onOpen);
    window.addEventListener("koda:active-thread", onActiveThread);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("koda:command-open", onOpen);
      window.removeEventListener("koda:active-thread", onActiveThread);
    };
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 80)}px`;
  }, [query]);

  function onChange(value: string) {
    setResponse(null);
    setQuery(value);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  function refreshChangedData(refresh: ChatResponse["refresh"]) {
    if (!refresh?.length) return;
    window.dispatchEvent(new Event("koda:data-refresh"));
    if (refresh.includes("calendar")) {
      window.setTimeout(() => {
        window.dispatchEvent(new Event("koda:data-refresh"));
      }, 1200);
    }
  }

  async function submit(messageOverride?: string) {
    const message = (messageOverride ?? query).trim();
    if (!message) return;

    setBusy(true);
    setResponse(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/koda/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, timeZone, activeThread }),
      });
      const payload = (await response.json().catch(() => ({}))) as ChatResponse;
      if (!response.ok) {
        setResponse({
          status: "error",
          message: payload.message ?? payload.error ?? "Could not run KODA AI.",
          retainPrompt: true,
          components: payload.components ?? [
            {
              type: "text",
              text:
                payload.message ?? payload.error ?? "Could not run KODA AI.",
            },
          ],
        });
        return;
      }
      setResponse(payload);
      refreshChangedData(payload.refresh);
      if (!payload.retainPrompt && payload.status !== "error") {
        setQuery("");
      }
    } catch (error) {
      setResponse({
        status: "error",
        message:
          error instanceof Error ? error.message : "Could not run KODA AI.",
        retainPrompt: true,
        components: [
          {
            type: "text",
            text:
              error instanceof Error ? error.message : "Could not run KODA AI.",
          },
        ],
      });
    } finally {
      setBusy(false);
    }
  }

  function submitFollowUp(
    component: Extract<KodaResponseComponent, { type: "input" }>,
    value: string,
  ) {
    const followUp = value.trim();
    if (!followUp) return;

    const labelPrefix = `${component.label}:`.toLowerCase();
    const base = query
      .split("\n")
      .filter((line) => !line.trim().toLowerCase().startsWith(labelPrefix))
      .join("\n")
      .trim();
    const nextMessage = base
      ? `${base}\n${component.label}: ${followUp}`
      : followUp;
    setQuery(nextMessage);
    void submit(nextMessage);
  }

  async function runConfirmableAction(action: ConfirmableAction) {
    setActionBusy(true);
    try {
      if (action.type === "send_reply") {
        const response = await fetch("/api/koda/gmail/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: action.threadId,
            body: action.body,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not send reply.");
        }
        window.dispatchEvent(new Event("koda:data-refresh"));
        setResponse({
          status: "success",
          message: "Reply sent.",
          components: [{ type: "text", text: "Reply sent." }],
        });
      }

      if (action.type === "delete_event") {
        const response = await fetch(
          `/api/koda/calendar/events/${encodeURIComponent(action.eventId)}`,
          { method: "DELETE" },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not delete event.");
        }
        window.dispatchEvent(new Event("koda:data-refresh"));
        setResponse({
          status: "success",
          message: "Event deleted.",
          components: [{ type: "text", text: "Event deleted." }],
        });
      }
    } catch (error) {
      setResponse({
        status: "error",
        message:
          error instanceof Error ? error.message : "Could not run action.",
        retainPrompt: true,
        components: [
          {
            type: "text",
            text:
              error instanceof Error ? error.message : "Could not run action.",
          },
        ],
      });
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-[57px] z-30 lg:bottom-0 lg:left-[256px]">
      <div className="relative mx-auto max-w-3xl px-3 pb-3 sm:px-4">
        {popupOpen && (
          <div className="absolute right-3 bottom-full left-3 mb-2 max-h-[60vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-panel-elevated)] shadow-[var(--shadow-soft)] sm:right-4 sm:left-4">
            {response && (
              <KodaResponseRenderer
                response={response}
                busy={actionBusy}
                onAction={(action) => void runConfirmableAction(action)}
                onFollowUp={submitFollowUp}
                onClose={() => setResponse(null)}
              />
            )}
          </div>
        )}

        {/* Docked input */}
        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-panel-elevated)] px-3 py-2 shadow-[var(--shadow-soft)]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] font-mono text-[10px] font-medium text-[var(--color-surface)]">
            K
          </span>
          <textarea
            ref={inputRef}
            rows={1}
            value={query}
            disabled={inlineInputActive}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask KODA to search, write replies, or manage calendar events…"
            className="max-h-20 min-h-5 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent text-[14px] leading-5 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          />
          {query.trim() ? (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || inlineInputActive}
              className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 font-mono text-[11px] text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              {busy ? "Running" : "↵ Run"}
            </button>
          ) : (
            <kbd className="shrink-0 rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-soft)]">
              ⌘K
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}

function statusTone(status: ChatResponse["status"]) {
  if (status === "error") return "bg-[var(--color-danger)]";
  if (status === "needs_input" || status === "requires_confirmation") {
    return "bg-[var(--color-warning)]";
  }
  return "bg-[var(--color-success)]";
}

function displayTime(value: string | null) {
  if (!value) return "Recently";
  const numeric = Number(value);
  const date = Number.isNaN(numeric) ? new Date(value) : new Date(numeric);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

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

function inboxSearchHref(query: string, threadId?: string) {
  const base = threadId ? `/inbox/${encodeURIComponent(threadId)}` : "/inbox";
  const normalized = query.trim();
  if (!normalized || isCalendarOnlySearchQuery(normalized)) return base;

  return `${base}?tab=search&q=${encodeURIComponent(normalized)}`;
}

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="email-md koda-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function KodaResponseRenderer({
  response,
  busy,
  onAction,
  onFollowUp,
  onClose,
}: {
  response: ChatResponse;
  busy: boolean;
  onAction: (action: ConfirmableAction) => void;
  onFollowUp: (
    component: Extract<KodaResponseComponent, { type: "input" }>,
    value: string,
  ) => void;
  onClose: () => void;
}) {
  const components = response.components?.length
    ? response.components
    : response.message
      ? [{ type: "text" as const, text: response.message }]
      : [];
  const visibleComponents = components.filter(
    (component) =>
      component.type !== "text" || component.text !== response.message,
  );

  return (
    <div className="relative px-3.5 py-3 pr-10">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close KODA response"
        className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel-strong)] hover:text-[var(--color-text)]"
      >
        ×
      </button>
      <div className="flex items-start gap-2.5 text-[13px] leading-6 text-[var(--color-text)]">
        <span
          className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${statusTone(response.status)}`}
        />
        <div className="min-w-0 flex-1 space-y-3">
          {response.message && <MarkdownText text={response.message} />}
          {visibleComponents.map((component, index) => (
            <KodaComponent
              key={`${component.type}-${index}`}
              component={component}
              busy={busy}
              onAction={onAction}
              onFollowUp={onFollowUp}
              onClose={onClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function KodaComponent({
  component,
  busy,
  onAction,
  onFollowUp,
  onClose,
}: {
  component: KodaResponseComponent;
  busy: boolean;
  onAction: (action: ConfirmableAction) => void;
  onFollowUp: (
    component: Extract<KodaResponseComponent, { type: "input" }>,
    value: string,
  ) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const followUpRef = useRef<HTMLInputElement>(null);
  const [replyBody, setReplyBody] = useState(
    component.type === "draft_reply" ? component.body : "",
  );
  const [selectedEventId, setSelectedEventId] = useState(
    component.type === "event_results" ? (component.events[0]?.id ?? "") : "",
  );
  const [followUpValue, setFollowUpValue] = useState("");

  useEffect(() => {
    if (component.type === "input") {
      followUpRef.current?.focus();
    }
  }, [component.type]);

  if (component.type === "text") {
    return <MarkdownText text={component.text} />;
  }

  if (component.type === "email_results") {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="kicker">Email results</p>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("koda:email-search-results", {
                  detail: {
                    query: component.query,
                  },
                }),
              );
              router.push(inboxSearchHref(component.query));
              onClose();
            }}
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2 py-1 text-[11px] font-medium text-white"
          >
            Show in inbox
          </button>
        </div>
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {component.threads.length === 0 && (
            <p className="px-2 py-2 text-[12px] text-[var(--color-text-soft)]">
              No matching emails.
            </p>
          )}
          {component.threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("koda:email-search-results", {
                    detail: {
                      query: component.query,
                    },
                  }),
                );
                router.push(inboxSearchHref(component.query, thread.id));
                onClose();
              }}
              className="block w-full rounded-[var(--radius-sm)] px-2 py-2 text-left transition hover:bg-[var(--color-surface-2)]"
            >
              <p className="truncate text-[12px] font-medium text-[var(--color-text)]">
                {thread.subject}
              </p>
              <p className="truncate text-[11px] text-[var(--color-text-soft)]">
                {thread.from} · {displayTime(thread.time)}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (component.type === "event_results") {
    const selected = component.events.find(
      (event) => event.id === selectedEventId,
    );
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-2">
        <p className="kicker mb-2">Calendar results</p>
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {component.events.length === 0 && (
            <p className="px-2 py-2 text-[12px] text-[var(--color-text-soft)]">
              No matching events.
            </p>
          )}
          {component.events.map((event) => (
            <label
              key={event.id}
              className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-sm)] px-2 py-2 transition hover:bg-[var(--color-surface-2)]"
            >
              {(component.intent === "delete" ||
                component.intent === "edit") && (
                <input
                  type="radio"
                  name="koda-event-result"
                  checked={selectedEventId === event.id}
                  onChange={() => setSelectedEventId(event.id)}
                  className="mt-1"
                />
              )}
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium text-[var(--color-text)]">
                  {event.title}
                </span>
                <span className="block text-[11px] text-[var(--color-text-soft)]">
                  {displayTime(event.start)}
                  {event.end ? ` - ${displayTime(event.end)}` : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
        {component.intent === "delete" &&
          component.events.length > 1 &&
          selected && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  onAction({ type: "delete_event", eventId: selected.id })
                }
                disabled={busy}
                className="rounded-[var(--radius-sm)] bg-[var(--color-danger)] px-3 py-1.5 text-[12px] font-medium text-white transition disabled:opacity-60"
              >
                {busy ? "Deleting..." : `Delete ${selected.title}`}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          )}
        {component.intent === "edit" && selected && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.assign(
                  `/calendar?eventId=${encodeURIComponent(selected.id)}`,
                );
                onClose();
              }}
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              Open in calendar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  if (component.type === "draft_reply") {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
        <p className="kicker">Draft reply</p>
        <p className="mt-2 text-[12px] text-[var(--color-text-soft)]">
          To {component.to}
        </p>
        <textarea
          value={replyBody}
          onChange={(event) => setReplyBody(event.target.value)}
          rows={6}
          className="mt-3 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] leading-6 text-[var(--color-text)] outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              onAction({
                type: "send_reply",
                threadId: component.threadId,
                body: replyBody,
              })
            }
            disabled={busy || !replyBody.trim()}
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {busy ? "Sending..." : "Send reply"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (component.type === "confirm_action") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onAction(component.action)}
          disabled={busy}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
        >
          {busy ? "Working..." : component.label}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (component.type === "input") {
    const canSubmit = followUpValue.trim().length > 0;
    return (
      <div>
        <label className="block">
          <span className="kicker">{component.label}</span>
          <div className="mt-2 flex gap-2">
            <input
              ref={followUpRef}
              value={followUpValue}
              onChange={(event) => setFollowUpValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (canSubmit) onFollowUp(component, followUpValue);
                }
              }}
              placeholder={component.placeholder}
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
            />
            <button
              type="button"
              onClick={() => onFollowUp(component, followUpValue)}
              disabled={!canSubmit}
              className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-2 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              Enter
            </button>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-2 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
          </div>
        </label>
      </div>
    );
  }

  return null;
}
