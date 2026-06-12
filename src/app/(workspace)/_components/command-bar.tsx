"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { commitmentColumns, inboxThreads } from "./mock-data";

type Mode = "ask" | "search" | "draft" | "schedule";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "ask", label: "ask", hint: "question about your work" },
  { id: "search", label: "search", hint: "find mail or commitments" },
  { id: "draft", label: "draft", hint: "write a reply" },
  { id: "schedule", label: "schedule", hint: "create a calendar event" },
];

const allCommitments = [
  ...commitmentColumns.mine.map((c) => ({ ...c, lane: "Promised by me" })),
  ...commitmentColumns.waitingOn.map((c) => ({
    ...c,
    lane: "Waiting on others",
  })),
];

const modeTone: Record<Mode, string> = {
  schedule: "text-[var(--color-success)] bg-[var(--color-success-soft)]",
  draft: "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
  search: "text-[var(--color-warning)] bg-[var(--color-warning-soft)]",
  ask: "text-[var(--color-text-muted)] bg-[var(--color-panel-strong)]",
};

export function CommandBar() {
  const [query, setQuery] = useState("");
  const [command, setCommand] = useState<Mode | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Popup only opens when something is explicit: a command is active, the user
  // is typing a slash command, a freeform question was run, or an action just
  // completed. Plain freeform typing shows no popup.
  const typingSlash = !command && focused && query.startsWith("/");
  const slashFilter = typingSlash ? query.slice(1).toLowerCase() : "";
  const filteredModes = useMemo(
    () => MODES.filter((m) => m.id.startsWith(slashFilter)),
    [slashFilter],
  );
  const popupOpen = Boolean(command) || typingSlash || Boolean(done) || asked;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setDone(null);
      }
    }
    function onOpen() {
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("koda:command-open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("koda:command-open", onOpen);
    };
  }, []);

  const searchResults = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t)
      return {
        threads: inboxThreads.slice(0, 3),
        commitments: allCommitments.slice(0, 2),
      };
    return {
      threads: inboxThreads.filter(
        (x) =>
          x.from.toLowerCase().includes(t) ||
          x.subject.toLowerCase().includes(t) ||
          x.preview.toLowerCase().includes(t),
      ),
      commitments: allCommitments.filter((c) =>
        c.title.toLowerCase().includes(t),
      ),
    };
  }, [query]);

  function activate(mode: Mode) {
    setCommand(mode);
    setQuery("");
    setDone(null);
    inputRef.current?.focus();
  }

  function clearCommand() {
    setCommand(null);
    setQuery("");
    setAsked(false);
  }

  function onChange(value: string) {
    setDone(null);
    setAsked(false);
    // `/ask `, `/schedule ` etc. activates the command and strips the prefix.
    const match = /^\/(ask|search|draft|schedule)\s(.*)$/i.exec(value);
    if (!command && match) {
      setCommand(match[1]!.toLowerCase() as Mode);
      setQuery(match[2] ?? "");
      return;
    }
    setQuery(value);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && command && query === "") {
      e.preventDefault();
      clearCommand();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (typingSlash) {
        const top = filteredModes[0];
        if (top) activate(top.id);
        return;
      }
      void submit();
    }
  }

  async function submit() {
    if (command === "schedule") {
      const title = query.trim() || "New event";
      const start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(9, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60000);
      setBusy(true);
      try {
        const response = await fetch("/api/koda/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            start: start.toISOString(),
            end: end.toISOString(),
            sendUpdates: "all",
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not create event.");
        }
        setDone("Event created on your calendar.");
        setCommand(null);
        setQuery("");
      } catch (error) {
        setDone(
          error instanceof Error ? error.message : "Could not create event.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    if (command === "draft") {
      setDone("Open a thread and use Reply from KODA to send through Gmail.");
      setCommand(null);
      setQuery("");
      return;
    }
    // ask command, or freeform text → answer from KODA.
    if (command === "ask" || (!command && query.trim())) {
      setAsked(true);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-[57px] z-30 lg:bottom-0 lg:left-[256px]">
      {popupOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => {
            setDone(null);
            clearCommand();
            inputRef.current?.blur();
          }}
          aria-hidden
        />
      )}

      <div className="relative mx-auto max-w-3xl px-3 pb-3 sm:px-4">
        {popupOpen && (
          <div className="absolute right-3 bottom-full left-3 mb-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-panel-elevated)] shadow-[var(--shadow-soft)] sm:right-4 sm:left-4">
            {done ? (
              <div className="flex items-center gap-2.5 px-3.5 py-3 text-[13px] text-[var(--color-text)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                {done}
              </div>
            ) : typingSlash ? (
              <div className="py-1.5">
                <p className="kicker px-3 py-1">Commands</p>
                {filteredModes.length === 0 && (
                  <p className="px-3 py-2 text-[13px] text-[var(--color-text-soft)]">
                    No command matches “/{slashFilter}”.
                  </p>
                )}
                {filteredModes.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      activate(m.id);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-[var(--color-panel)] ${
                      i === 0 ? "bg-[var(--color-panel)]" : ""
                    }`}
                  >
                    <span className="font-mono text-[12px] text-[var(--color-accent)]">
                      /{m.label}
                    </span>
                    <span className="text-[12px] text-[var(--color-text-soft)]">
                      {m.hint}
                    </span>
                  </button>
                ))}
              </div>
            ) : command === "schedule" ? (
              <SchedulePreview query={query} onConfirm={submit} />
            ) : command === "draft" ? (
              <DraftPreview onConfirm={submit} />
            ) : command === "search" ? (
              <div className="max-h-[46vh] overflow-y-auto px-3 py-3">
                <SearchResults results={searchResults} />
              </div>
            ) : command === "ask" || asked ? (
              <div className="px-3.5 py-3">
                <AskAnswer query={query} />
              </div>
            ) : null}
          </div>
        )}

        {/* Docked input */}
        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-panel-elevated)] px-3 py-2 shadow-[var(--shadow-soft)]">
          {command ? (
            <button
              type="button"
              onClick={clearCommand}
              className={`flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] uppercase ${modeTone[command]}`}
              title="Clear command (Backspace)"
            >
              /{command} ✕
            </button>
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] font-mono text-[10px] font-medium text-[var(--color-surface)]">
              K
            </span>
          )}
          <input
            ref={inputRef}
            value={query}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              command
                ? command === "schedule"
                  ? "Describe the event…"
                  : command === "draft"
                    ? "What should the reply say?"
                    : command === "search"
                      ? "Search mail and commitments…"
                      : "Ask about your commitments…"
                : "Type / for commands, or ask KODA anything…"
            }
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
          />
          {command || query.trim() ? (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
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

function PreviewShell({
  label,
  children,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <div className="px-3.5 py-3">
      <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3.5">
        <p className="kicker mb-2.5">{label}</p>
        {children}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)]"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function SchedulePreview({
  query,
  onConfirm,
}: {
  query: string;
  onConfirm: () => void;
}) {
  const title = query.trim() || "New event";
  return (
    <PreviewShell
      label="Proposed event"
      confirmLabel="Create event"
      onConfirm={onConfirm}
    >
      <p className="text-[14px] font-medium text-[var(--color-text)]">
        {title.charAt(0).toUpperCase() + title.slice(1)}
      </p>
      <dl className="mt-2.5 space-y-1.5 text-[12px]">
        {[
          ["When", "Tomorrow · 9:00–9:30 AM"],
          ["Calendar", "Primary"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-text-soft)] uppercase">
              {k}
            </dt>
            <dd className="text-[var(--color-text-muted)]">{v}</dd>
          </div>
        ))}
      </dl>
    </PreviewShell>
  );
}

function DraftPreview({ onConfirm }: { onConfirm: () => void }) {
  return (
    <PreviewShell
      label="Draft reply"
      confirmLabel="Save draft"
      onConfirm={onConfirm}
    >
      <p className="text-[13px] leading-6 text-[var(--color-text-muted)]">
        Following up on the points below — happy to jump on a quick call if that
        is easier. Let me know what works and I will send an invite.
      </p>
    </PreviewShell>
  );
}

function SearchResults({
  results,
}: {
  results: {
    threads: (typeof inboxThreads)[number][];
    commitments: typeof allCommitments;
  };
}) {
  const empty =
    results.threads.length === 0 && results.commitments.length === 0;
  if (empty)
    return (
      <p className="px-1 py-2 text-[13px] text-[var(--color-text-soft)]">
        No matches.
      </p>
    );
  return (
    <div className="space-y-3">
      {results.threads.length > 0 && (
        <div>
          <p className="kicker mb-1 px-1">Mail</p>
          {results.threads.map((t) => (
            <div
              key={t.subject}
              className="flex items-center justify-between gap-3 rounded-[var(--radius)] px-2.5 py-2 transition hover:bg-[var(--color-panel)]"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] text-[var(--color-text)]">
                  {t.subject}
                </p>
                <p className="truncate text-[11px] text-[var(--color-text-soft)]">
                  {t.from}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-[var(--color-text-soft)]">
                {t.time}
              </span>
            </div>
          ))}
        </div>
      )}
      {results.commitments.length > 0 && (
        <div>
          <p className="kicker mb-1 px-1">Commitments</p>
          {results.commitments.map((c) => (
            <div
              key={c.title}
              className="flex items-center justify-between gap-3 rounded-[var(--radius)] px-2.5 py-2 transition hover:bg-[var(--color-panel)]"
            >
              <p className="min-w-0 truncate text-[13px] text-[var(--color-text)]">
                {c.title}
              </p>
              <span className="shrink-0 font-mono text-[10px] text-[var(--color-text-soft)]">
                {c.due}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AskAnswer({ query }: { query: string }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[14px] leading-7 text-[var(--color-text)]">
        You have <span className="font-medium">3 open commitments</span> this
        week. One is overdue: the Northwind MSA redlines (2 days). Priya&apos;s
        Q3 pricing sheet is due tomorrow 9 AM, and the Vela intro reply is due
        Friday.
      </p>
      {query.trim() && (
        <p className="text-[12px] text-[var(--color-text-soft)]">
          Answered from KODA&apos;s commitment data · for “{query.trim()}”
        </p>
      )}
    </div>
  );
}
