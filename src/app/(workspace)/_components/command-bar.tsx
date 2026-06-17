"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { DictationButton } from "./dictation-button";
import { KodaLogo } from "../../_components/koda-logo";

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

/** One turn in the ephemeral, in-memory conversation (never persisted). */
type ChatTurn =
  | { role: "user"; text: string }
  | { role: "assistant"; response: ChatResponse };

// Vertical blur dome above the input: taller than wide so it disperses in a
// soft circle (more vertical, less horizontal) and stays symmetric on both
// sides — strongest at the input, fading round toward the top and edges.
const BLUR_MASK =
  "radial-gradient(76% 100% at 50% 100%, #000 32%, rgba(0,0,0,0.55) 60%, transparent 80%)";
// Conversation fades only near the very top so the first message stays readable.
const FADE_MASK = "linear-gradient(to top, #000 84%, transparent 100%)";

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

type EmailAlias = {
  id: string;
  alias: string;
  email: string;
  label: string | null;
};

type EmailDraftSummary = {
  id: string;
  messageId: string | null;
  threadId: string | null;
  from: string | null;
  to: string[];
  subject: string;
  body: string;
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
  | {
      type: "draft_email";
      draftId: string;
      to: string[];
      subject: string;
      body: string;
    }
  | { type: "confirm_action"; label: string; action: ConfirmableAction }
  | { type: "input"; label: string; name: string; placeholder?: string };

function resolveAliasHandles(text: string, aliases: EmailAlias[]): string {
  let result = text;
  for (const alias of aliases) {
    const escaped = alias.alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`@${escaped}\\b`, "gi"), alias.email);
  }
  return result;
}

export function CommandBar() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [focused, setFocused] = useState(false);
  const [activeThread, setActiveThread] = useState<ActiveThreadContext | null>(
    null,
  );
  const [drafts, setDrafts] = useState<EmailDraftSummary[]>([]);
  const [draftsBusy, setDraftsBusy] = useState(false);
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [aliasSuggestions, setAliasSuggestions] = useState<EmailAlias[]>([]);
  const [aliasQuery, setAliasQuery] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const micListeningRef = useRef(false);

  // The overlay (blurred backdrop + history panel) is open while the input is
  // focused or there is conversation to show.
  const hasHistory = messages.length > 0;
  const open = focused || hasHistory;

  // Inline follow-up input comes from the most recent assistant turn.
  const lastAssistantResponse =
    [...messages].reverse().find((turn) => turn.role === "assistant")
      ?.response ?? null;
  const inlineInputActive = Boolean(
    lastAssistantResponse?.components?.some(
      (component) => component.type === "input",
    ),
  );

  const appendUser = (text: string) =>
    setMessages((turns) => [...turns, { role: "user", text }]);
  const appendAssistant = (response: ChatResponse) =>
    setMessages((turns) => [...turns, { role: "assistant", response }]);
  const clearConversation = () => {
    console.log("Clearing conversation context");
    setMessages([]);
    setQuery("");
    setAliasSuggestions([]);
    setAliasQuery(null);
  };

  async function refreshDrafts() {
    setDraftsBusy(true);
    try {
      const response = await fetch("/api/koda/gmail/drafts", {
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        drafts?: EmailDraftSummary[];
      };
      if (response.ok) setDrafts(payload.drafts ?? []);
    } finally {
      setDraftsBusy(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (e.shiftKey) {
          // ⌘⇧K → toggle voice input.
          window.dispatchEvent(new Event("koda:mic-toggle"));
        } else {
          inputRef.current?.focus();
        }
      }
      if (e.key === "Escape") {
        // If the mic is recording, Esc stops the mic only (handled by the
        // dictation button) — don't also close the chat.
        if (micListeningRef.current) return;
        inputRef.current?.blur();
        setFocused(false);
        clearConversation();
      }
    }
    function onOpen() {
      inputRef.current?.focus();
    }
    function onActiveThread(event: Event) {
      const detail = (event as CustomEvent<ActiveThreadContext | null>).detail;
      setActiveThread(detail ?? null);
    }
    function onMicState(event: Event) {
      micListeningRef.current = Boolean(
        (event as CustomEvent<{ listening?: boolean }>).detail?.listening,
      );
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("koda:command-open", onOpen);
    window.addEventListener("koda:active-thread", onActiveThread);
    window.addEventListener("koda:mic-state", onMicState);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("koda:command-open", onOpen);
      window.removeEventListener("koda:active-thread", onActiveThread);
      window.removeEventListener("koda:mic-state", onMicState);
    };
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 80)}px`;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    void refreshDrafts();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/koda/aliases")
      .then((r) => r.json())
      .then((data: { aliases?: EmailAlias[] }) =>
        setAliases(data.aliases ?? []),
      )
      .catch(() => {});
  }, [open]);

  // Keep the latest turn in view as the conversation grows.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function onChange(value: string) {
    setQuery(value);
    const match = value.match(/(?:^|[\s,])(@[a-zA-Z0-9_-]*)$/);
    if (match && aliases.length > 0 && match[1] !== undefined) {
      const handle = match[1];
      const word = handle.slice(1).toLowerCase();
      setAliasQuery(handle);
      setAliasSuggestions(
        word.length === 0
          ? aliases
          : aliases.filter((a) => a.alias.toLowerCase().includes(word)),
      );
    } else if (match && aliases.length === 0) {
      setAliasQuery(null);
      setAliasSuggestions([]);
    } else {
      setAliasQuery(null);
      setAliasSuggestions([]);
    }
  }

  function selectAlias(alias: EmailAlias) {
    if (!aliasQuery) return;
    const escaped = aliasQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const next = query.replace(new RegExp(escaped + "$"), alias.email);
    setQuery(next);
    setAliasSuggestions([]);
    setAliasQuery(null);
    setTimeout(() => inputRef.current?.focus(), 0);
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
    const rawMessage = (messageOverride ?? query).trim();
    if (!rawMessage) return;

    // Resolve @alias handles → real email addresses before sending to AI.
    // The display text keeps @alias so the user sees what they typed.
    const apiMessage = resolveAliasHandles(rawMessage, aliases);

    // Prior turns become context for this request. Built before appending the
    // new user turn so the current message isn't duplicated server-side.
    const history = messages
      .map((turn) =>
        turn.role === "user"
          ? { role: "user" as const, content: turn.text }
          : {
              role: "assistant" as const,
              content: turn.response.message ?? "",
            },
      )
      .filter((turn) => turn.content.trim().length > 0);

    setBusy(true);
    appendUser(rawMessage);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/koda/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: apiMessage,
          timeZone,
          activeThread,
          history,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ChatResponse;
      if (!response.ok) {
        appendAssistant({
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
      appendAssistant(payload);
      if (payload.status !== "error") {
        window.dispatchEvent(new Event("koda:ai-used"));
      }
      refreshChangedData(payload.refresh);
      if (!payload.retainPrompt && payload.status !== "error") {
        setQuery("");
      }
    } catch (error) {
      appendAssistant({
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
        appendAssistant({
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
        appendAssistant({
          status: "success",
          message: "Event deleted.",
          components: [{ type: "text", text: "Event deleted." }],
        });
      }
    } catch (error) {
      appendAssistant({
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

  async function deleteStoredDraft(draftId: string) {
    setDraftsBusy(true);
    try {
      await fetch(`/api/koda/gmail/drafts/${encodeURIComponent(draftId)}`, {
        method: "DELETE",
      });
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } catch {
      // silently ignore
    } finally {
      setDraftsBusy(false);
    }
  }

  async function sendStoredDraft(draftId: string) {
    setActionBusy(true);
    try {
      const response = await fetch(
        `/api/koda/gmail/drafts/${encodeURIComponent(draftId)}/send`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not send draft.");
      }
      window.dispatchEvent(new Event("koda:data-refresh"));
      await refreshDrafts();
      appendAssistant({
        status: "success",
        message: "Draft sent.",
        components: [{ type: "text", text: "Draft sent." }],
      });
    } catch (error) {
      appendAssistant({
        status: "error",
        message:
          error instanceof Error ? error.message : "Could not send draft.",
        retainPrompt: true,
        components: [
          {
            type: "text",
            text:
              error instanceof Error ? error.message : "Could not send draft.",
          },
        ],
      });
    } finally {
      setActionBusy(false);
    }
  }

  if (pathname?.startsWith("/profile")) return null;

  return (
    <div
      ref={panelRef}
      className="fixed inset-x-0 bottom-[57px] z-30 lg:bottom-0 lg:left-[256px]"
    >
      <div className="relative mx-auto max-w-3xl px-3 pb-3 sm:px-4">
        {/* Vertical blur dome above the input — symmetric, circular dispersion. */}
        {open && (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-4 bottom-full h-[64vh] bg-[color-mix(in_oklab,var(--color-surface)_22%,transparent)] backdrop-blur-2xl"
            style={{ maskImage: BLUR_MASK, WebkitMaskImage: BLUR_MASK }}
          />
        )}

        {/* Conversation — newest by the input, older turns fade out at top. */}
        {open && hasHistory && (
          <div
            className="absolute inset-x-3 bottom-full flex h-[64vh] flex-col justify-end overflow-hidden pb-1 sm:inset-x-4"
            style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
          >
            <div className="pointer-events-auto flex max-h-full scroll-pt-24 flex-col gap-3 overflow-y-auto overscroll-contain px-1 pt-24 pr-2">
              {drafts.length > 0 && (
                <DraftTray
                  drafts={drafts}
                  busy={actionBusy || draftsBusy}
                  onSend={(draftId) => void sendStoredDraft(draftId)}
                  onDelete={(draftId) => void deleteStoredDraft(draftId)}
                  onRefresh={() => void refreshDrafts()}
                />
              )}
              {messages.map((turn, index) =>
                turn.role === "user" ? (
                  <div key={index} className="pop flex justify-end">
                    <div className="max-w-[85%] rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[color-mix(in_oklab,var(--color-panel-elevated)_94%,transparent)] px-3.5 py-2 text-[13px] leading-6 whitespace-pre-wrap text-[var(--color-text)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
                      {turn.text}
                    </div>
                  </div>
                ) : (
                  <div
                    key={index}
                    className="pop max-w-[92%] rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[color-mix(in_oklab,var(--color-panel-elevated)_96%,transparent)] shadow-[var(--shadow-soft)] backdrop-blur-xl"
                  >
                    <KodaResponseRenderer
                      response={turn.response}
                      busy={actionBusy}
                      onAction={(action) => void runConfirmableAction(action)}
                      onFollowUp={submitFollowUp}
                      onDraftsChanged={() => void refreshDrafts()}
                      onClose={clearConversation}
                    />
                  </div>
                ),
              )}
              <div ref={scrollAnchorRef} />
            </div>
            {hasHistory && (
              <div className="flex justify-end px-3">
                <button
                  type="button"
                  onClick={clearConversation}
                  className="tap pop inline-flex cursor-pointer items-center gap-1 font-mono text-[9.5px] tracking-[0.08em] text-[var(--color-danger)] uppercase shadow-[var(--shadow-soft)] backdrop-blur-xl transition hover:underline"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M3 4h10M6.5 4V2.8h3V4M5 4l.6 9h4.8L11 4" />
                  </svg>
                  Clear chat
                </button>
              </div>
            )}
          </div>
        )}

        {/* Docked input */}
        <div className="relative">
          {aliasSuggestions.length > 0 && (
            <div className="absolute right-0 bottom-full left-0 mb-1.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[color-mix(in_oklab,var(--color-panel-elevated)_97%,transparent)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
              <p className="px-3 pt-2.5 pb-1 font-mono text-[9.5px] tracking-[0.08em] text-[var(--color-text-soft)] uppercase">
                Aliases
              </p>
              {aliasSuggestions.slice(0, 5).map((alias) => (
                <button
                  key={alias.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectAlias(alias);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[var(--color-panel-strong)]"
                >
                  <span className="text-[13px] font-medium text-[var(--color-accent)]">
                    @{alias.alias}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-text-soft)]">
                    {alias.email}
                  </span>
                  {alias.label && (
                    <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                      {alias.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[color-mix(in_oklab,var(--color-panel-elevated)_94%,transparent)] px-3 py-2 shadow-[0_0_0_2px_var(--color-accent-soft),var(--shadow-soft)] backdrop-blur-xl transition-all duration-200 focus-within:shadow-[0_0_0_3px_var(--color-accent-soft),var(--shadow-soft)]">
            <span
              className={`flex h-5 w-5 shrink-0 ${busy ? "animate-pulse" : ""}`}
            >
              <KodaLogo markClassName="h-5 w-5" />
            </span>
            <div className="relative flex min-w-0 flex-1 items-center self-center">
              {/(@[a-zA-Z0-9_-]+)/.test(query) && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 max-h-20 overflow-hidden text-[14px] leading-5 break-words whitespace-pre-wrap"
                  style={{ color: "var(--color-text)" }}
                >
                  {query.split(/(@[a-zA-Z0-9_-]+)/g).map((part, i) =>
                    /^@[a-zA-Z0-9_-]+$/.test(part) ? (
                      <span
                        key={i}
                        style={{
                          color: aliases.some(
                            (a) =>
                              a.alias.toLowerCase() ===
                              part.slice(1).toLowerCase(),
                          )
                            ? "var(--color-accent)"
                            : "var(--color-text)",
                        }}
                      >
                        {part}
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
                </div>
              )}
              <textarea
                ref={inputRef}
                rows={1}
                value={query}
                disabled={inlineInputActive}
                onFocus={() => setFocused(true)}
                onBlur={(e) => {
                  setFocused(false);
                  // Leaving the whole panel (not jumping to a button inside it)
                  // ends the session and resets conversation context.
                  if (!panelRef.current?.contains(e.relatedTarget)) {
                    clearConversation();
                  }
                }}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask KODA to search, write replies, or manage calendar events…"
                className={`max-h-20 min-h-5 w-full resize-none overflow-y-auto bg-transparent text-[14px] leading-5 outline-none placeholder:text-[var(--color-text-soft)] disabled:cursor-not-allowed disabled:opacity-60 ${/(@[a-zA-Z0-9_-]+)/.test(query) && aliases.length > 0 ? "[color:transparent] [caret-color:var(--color-text)]" : "text-[var(--color-text)]"}`}
              />
            </div>
            <DictationButton
              value={query}
              onChange={onChange}
              onSubmit={() => void submit()}
              disabled={inlineInputActive || busy}
            />
            {query.trim() && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear input"
                  className="tap flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel-strong)] hover:text-[var(--color-text)]"
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
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={busy || inlineInputActive}
                  className="tap shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 font-mono text-[11px] text-white hover:bg-[var(--color-accent-strong)] disabled:opacity-70"
                >
                  {busy ? (
                    <span className="inline-flex items-center gap-1">
                      Running
                      <span className="inline-flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1 w-1 animate-bounce rounded-full bg-current"
                            style={{ animationDelay: `${i * 120}ms` }}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    "↵ Run"
                  )}
                </button>
              </>
            )}
          </div>
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

function parseAddressList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="email-md koda-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function DraftTray({
  drafts,
  busy,
  onSend,
  onDelete,
  onRefresh,
}: {
  drafts: EmailDraftSummary[];
  busy: boolean;
  onSend: (draftId: string) => void;
  onDelete: (draftId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="pop rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[color-mix(in_oklab,var(--color-panel-elevated)_96%,transparent)] p-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="kicker">Drafted emails</p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2 py-1 text-[11px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
        >
          Refresh
        </button>
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-[var(--color-text)]">
                {draft.subject}
              </p>
              <p className="truncate text-[11px] text-[var(--color-text-soft)]">
                To {draft.to.join(", ") || "Unknown recipient"}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--color-text-muted)]">
                {draft.body || "No body"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => onSend(draft.id)}
                disabled={busy}
                className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
              >
                {busy ? "…" : "Send"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(draft.id)}
                disabled={busy}
                className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] text-[var(--color-text-soft)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KodaResponseRenderer({
  response,
  busy,
  onAction,
  onFollowUp,
  onDraftsChanged,
  onClose,
}: {
  response: ChatResponse;
  busy: boolean;
  onAction: (action: ConfirmableAction) => void;
  onFollowUp: (
    component: Extract<KodaResponseComponent, { type: "input" }>,
    value: string,
  ) => void;
  onDraftsChanged: () => void;
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
    <div className="pop px-3.5 py-3">
      <div className="flex items-start gap-2.5 text-[13px] leading-6 text-[var(--color-text)]">
        <span
          className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${statusTone(response.status)}`}
        />
        <div className="stagger min-w-0 flex-1 space-y-3">
          {response.message && <MarkdownText text={response.message} />}
          {visibleComponents.map((component, index) => (
            <KodaComponent
              key={`${component.type}-${index}`}
              component={component}
              busy={busy}
              onAction={onAction}
              onFollowUp={onFollowUp}
              onDraftsChanged={onDraftsChanged}
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
  onDraftsChanged,
  onClose,
}: {
  component: KodaResponseComponent;
  busy: boolean;
  onAction: (action: ConfirmableAction) => void;
  onFollowUp: (
    component: Extract<KodaResponseComponent, { type: "input" }>,
    value: string,
  ) => void;
  onDraftsChanged: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const followUpRef = useRef<HTMLInputElement>(null);
  const navigatedRef = useRef(false);
  const [navPending, startNav] = useTransition();
  const [replyBody, setReplyBody] = useState(
    component.type === "draft_reply" ? component.body : "",
  );
  const [emailTo, setEmailTo] = useState(
    component.type === "draft_email" ? component.to.join(", ") : "",
  );
  const [emailSubject, setEmailSubject] = useState(
    component.type === "draft_email" ? component.subject : "",
  );
  const [emailBody, setEmailBody] = useState(
    component.type === "draft_email" ? component.body : "",
  );
  const [emailDraftStatus, setEmailDraftStatus] = useState<string | null>(null);
  const [emailDraftBusy, setEmailDraftBusy] = useState<"save" | "send" | null>(
    null,
  );
  const [selectedEventId, setSelectedEventId] = useState(
    component.type === "event_results" ? (component.events[0]?.id ?? "") : "",
  );
  const [followUpValue, setFollowUpValue] = useState("");

  // Open results in the inbox, keeping a spinner up until the route resolves.
  function openInInbox(href: string, query: string) {
    window.dispatchEvent(
      new CustomEvent("koda:email-search-results", { detail: { query } }),
    );
    navigatedRef.current = true;
    startNav(() => router.push(href));
  }

  // Close the chat once the inbox navigation has finished loading.
  useEffect(() => {
    if (navigatedRef.current && !navPending) {
      navigatedRef.current = false;
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navPending]);

  useEffect(() => {
    if (component.type === "input") {
      followUpRef.current?.focus();
    }
  }, [component.type]);

  async function updateGeneratedDraft(createCommitment: boolean) {
    if (component.type !== "draft_email") return;
    setEmailDraftBusy("save");
    setEmailDraftStatus(null);
    try {
      const response = await fetch(
        `/api/koda/gmail/drafts/${encodeURIComponent(component.draftId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: parseAddressList(emailTo),
            subject: emailSubject,
            body: emailBody,
            createCommitment,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update draft.");
      }
      setEmailDraftStatus(
        createCommitment
          ? "Draft stored and commitment created."
          : "Draft updated.",
      );
      onDraftsChanged();
    } catch (error) {
      setEmailDraftStatus(
        error instanceof Error ? error.message : "Could not update draft.",
      );
    } finally {
      setEmailDraftBusy(null);
    }
  }

  async function sendGeneratedDraft() {
    if (component.type !== "draft_email") return;
    setEmailDraftBusy("send");
    setEmailDraftStatus(null);
    try {
      const response = await fetch(
        `/api/koda/gmail/drafts/${encodeURIComponent(component.draftId)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: parseAddressList(emailTo),
            subject: emailSubject,
            body: emailBody,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not send draft.");
      }
      window.dispatchEvent(new Event("koda:data-refresh"));
      setEmailDraftStatus("Draft sent.");
      onDraftsChanged();
    } catch (error) {
      setEmailDraftStatus(
        error instanceof Error ? error.message : "Could not send draft.",
      );
    } finally {
      setEmailDraftBusy(null);
    }
  }

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
            disabled={navPending}
            onClick={() =>
              openInInbox(inboxSearchHref(component.query), component.query)
            }
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2 py-1 text-[11px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-70"
          >
            {navPending && (
              <span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />
            )}
            {navPending ? "Opening…" : "Show in inbox"}
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
              disabled={navPending}
              onClick={() =>
                openInInbox(
                  inboxSearchHref(component.query, thread.id),
                  component.query,
                )
              }
              className="block w-full rounded-[var(--radius-sm)] px-2 py-2 text-left transition hover:bg-[var(--color-surface-2)] disabled:opacity-60"
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

  if (component.type === "draft_email") {
    const recipients = parseAddressList(emailTo);
    const canAct =
      recipients.length > 0 && emailSubject.trim() && emailBody.trim();
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
        <p className="kicker">Review email draft</p>
        <label className="mt-2 block">
          <span className="text-[11px] text-[var(--color-text-soft)]">To</span>
          <input
            value={emailTo}
            onChange={(event) => setEmailTo(event.target.value)}
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] text-[var(--color-text)] outline-none"
          />
        </label>
        <label className="mt-2 block">
          <span className="text-[11px] text-[var(--color-text-soft)]">
            Subject
          </span>
          <input
            value={emailSubject}
            onChange={(event) => setEmailSubject(event.target.value)}
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] text-[var(--color-text)] outline-none"
          />
        </label>
        <textarea
          value={emailBody}
          onChange={(event) => setEmailBody(event.target.value)}
          rows={8}
          className="mt-3 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] leading-6 text-[var(--color-text)] outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void sendGeneratedDraft()}
            disabled={busy || emailDraftBusy !== null || !canAct}
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {emailDraftBusy === "send" ? "Sending..." : "Send email"}
          </button>
          <button
            type="button"
            onClick={() => void updateGeneratedDraft(true)}
            disabled={busy || emailDraftBusy !== null || !canAct}
            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
          >
            {emailDraftBusy === "save" ? "Storing..." : "Store as draft"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy || emailDraftBusy !== null}
            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
        {emailDraftStatus && (
          <p className="mt-2 text-[11px] text-[var(--color-text-soft)]">
            {emailDraftStatus}
          </p>
        )}
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
