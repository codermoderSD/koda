import { getInboxThreads } from "~/server/koda/inbox";

import { inboxThreads as mockThreads } from "../_components/mock-data";

function formatReceivedAt(value: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const priorityTone: Record<string, string> = {
  URGENT: "text-[var(--color-danger)] bg-[var(--color-danger-soft)]",
  NEW: "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
  PRIORITY: "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
  "NEEDS REPLY": "text-[var(--color-warning)] bg-[var(--color-warning-soft)]",
  "WAITING ON": "text-[var(--color-text-soft)] bg-[var(--color-panel-strong)]",
  OPEN: "text-[var(--color-text-soft)] bg-[var(--color-panel-strong)]",
};

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

export default async function InboxPage() {
  const liveThreads = await getInboxThreads({ maxResults: 16 });
  const threads =
    liveThreads.length > 0
      ? liveThreads.map((thread) => ({
          id: thread.id,
          from: thread.from,
          subject: thread.subject,
          preview: thread.preview,
          time: formatReceivedAt(thread.receivedAt),
          priority: thread.labels.includes("UNREAD")
            ? "NEW"
            : thread.labels.includes("IMPORTANT")
              ? "PRIORITY"
              : "OPEN",
        }))
      : mockThreads.map((thread, index) => ({
          ...thread,
          id: `${thread.from}-${index}`,
        }));

  const needsReply = threads.filter((t) =>
    ["NEEDS REPLY", "URGENT", "NEW"].includes(t.priority),
  ).length;
  const activeThread = threads[0];

  return (
    <div className="flex w-full flex-col gap-5 lg:h-full lg:min-h-0">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Inbox</p>
          <h1 className="mt-1.5 text-xl font-medium tracking-tight text-[var(--color-text)] sm:text-2xl">
            Mail
          </h1>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-muted)] sm:gap-4 sm:text-[13px]">
          <span>
            <span className="font-mono text-[var(--color-text)]">
              {threads.length}
            </span>{" "}
            threads
          </span>
          <span className="h-3 w-px bg-[var(--color-line)]" />
          <span>
            <span className="font-mono text-[var(--color-warning)]">
              {needsReply}
            </span>{" "}
            need reply
          </span>
        </div>
      </header>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        {/* Thread list */}
        <section className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)]">
          <div className="flex items-center gap-1 border-b border-[var(--color-line)] px-3 py-2.5">
            <button className="rounded-[var(--radius-sm)] bg-[var(--color-panel-strong)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-text)]">
              Focused
            </button>
            <button className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] text-[var(--color-text-soft)] transition hover:text-[var(--color-text)]">
              All mail
            </button>
          </div>

          <div className="divide-y divide-[var(--color-line)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {threads.map((thread, index) => (
              <article
                key={thread.id}
                className={`cursor-pointer px-3.5 py-3 transition ${
                  index === 0
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
              </article>
            ))}
          </div>
        </section>

        {/* Reading pane */}
        <section className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h2 className="truncate text-base font-medium tracking-tight text-[var(--color-text)] sm:text-lg">
                {activeThread?.subject}
              </h2>
              <p className="mt-1 truncate text-[13px] text-[var(--color-text-soft)]">
                {activeThread?.from} · to shubham@koda.dev
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="rounded-[var(--radius)] bg-[var(--color-accent)] px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
              >
                Reply
              </button>
              <button
                type="button"
                className="hidden rounded-[var(--radius)] border border-[var(--color-line)] px-3.5 py-1.5 text-[13px] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)] sm:block"
              >
                Archive
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[var(--color-line)] px-4 py-2.5 text-[12px] text-[var(--color-text-soft)] sm:px-5">
            <span>
              <span className="font-mono">Labels</span> · Inbox, Follow-up
            </span>
            <span>
              <span className="font-mono">Priority</span> · Needs reply
            </span>
          </div>

          <div className="space-y-4 px-4 py-5 text-[14px] leading-7 text-[var(--color-text-muted)] sm:px-5 sm:py-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <p>Hi Shubham,</p>
            <p>
              Can you send the Q3 pricing breakdown before tomorrow&apos;s review?
              If it helps, I can also share the notes from our last call so the
              numbers line up before we go in.
            </p>
            <p>
              We should also lock a short prep block so we arrive with the updated
              figures ready.
            </p>
            <p className="text-[var(--color-text)]">Priya</p>
          </div>

          <div className="border-t border-[var(--color-line)] px-4 py-3 sm:px-5">
            <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-soft)]">
              Reply to {activeThread?.from}…
            </div>
          </div>
        </section>

        {/* Context rail */}
        <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              <p className="kicker text-[var(--color-accent)]">
                Extracted commitment
              </p>
            </div>
            <p className="mt-3 text-[14px] font-medium leading-6 text-[var(--color-text)]">
              Send Q3 pricing breakdown before tomorrow&apos;s review.
            </p>
            <dl className="mt-4 space-y-2 text-[12px]">
              {[
                ["Owner", "You"],
                ["Counterparty", "Priya Shah"],
                ["Deadline", "Tomorrow · 9:00 AM"],
                ["Confidence", "High"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <dt className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-text-soft)] uppercase">
                    {k}
                  </dt>
                  <dd className="text-[var(--color-text-muted)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="kicker">Suggested actions</p>
            <div className="mt-3 space-y-1.5">
              {[
                "Draft reply with pricing",
                "Add prep block to calendar",
                "Track as commitment",
              ].map((action) => (
                <button
                  key={action}
                  type="button"
                  className="flex w-full items-center justify-between rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2.5 text-left text-[13px] text-[var(--color-text-muted)] transition hover:border-[var(--color-line-strong)] hover:text-[var(--color-text)]"
                >
                  {action}
                  <span className="text-[var(--color-text-soft)]">→</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
