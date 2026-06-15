import { getCalendarWindow } from "~/server/koda/calendar";
import {
  getInboxThread,
  getInboxThreadPage,
  type InboxThread,
} from "~/server/koda/inbox";
import {
  listActiveCommitmentsByThreadIds,
  type KodaCommitment,
} from "~/server/koda/commitments";

import { inboxThreads as mockThreads } from "../_components/mock-data";
import { WorkspaceConsole, type Thread } from "./workspace-console";

function formatReceivedAt(value: string | null) {
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

function priorityFor(labels: string[], commitment?: KodaCommitment) {
  if (commitment) return "NEEDS REPLY";
  if (labels.includes("UNREAD")) return "NEW";
  if (labels.includes("IMPORTANT")) return "PRIORITY";
  return "OPEN";
}

function isCalendarOnlyQuery(query: string) {
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

function normalizeInboxSearchQuery(query: string | undefined) {
  const normalized = query?.trim();
  if (!normalized || isCalendarOnlyQuery(normalized)) return undefined;
  return normalized;
}

function formatCommitmentDeadline(value: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toThreadCommitment(commitment: KodaCommitment | undefined) {
  if (!commitment) return undefined;
  const confidence = commitment.confidence
    ? `${Math.round(Number(commitment.confidence) * 100)}%`
    : "Unknown";
  return {
    title: commitment.actionSummary,
    owner:
      commitment.type === "OUTBOUND"
        ? "Me"
        : (commitment.counterpartyEmail ?? "Counterparty"),
    counterparty: commitment.counterpartyEmail ?? "Unknown",
    deadline: formatCommitmentDeadline(commitment.deadline),
    confidence,
  };
}

export function toConsoleThread(
  thread: InboxThread,
  commitment?: KodaCommitment,
): Thread {
  return {
    id: thread.id,
    from: thread.from,
    to: thread.to,
    subject: thread.subject,
    preview: thread.preview,
    body: thread.body ?? thread.preview,
    time: formatReceivedAt(thread.receivedAt),
    priority: priorityFor(thread.labels, commitment),
    commitment: toThreadCommitment(commitment),
    messages: thread.messages.map((message) => ({
      id: message.id,
      from: message.from,
      to: message.to,
      body: message.body,
      preview: message.preview,
      time: formatReceivedAt(message.receivedAt),
      receivedAt: message.receivedAt,
    })),
  };
}

export async function InboxWorkspace({
  selectedThreadId,
  searchQuery,
  initialTab,
}: {
  selectedThreadId?: string;
  searchQuery?: string;
  initialTab?: "focused" | "all" | "search";
}) {
  const now = new Date();
  const normalizedSearchQuery = normalizeInboxSearchQuery(searchQuery);
  const normalizedInitialTab =
    initialTab === "search" && !normalizedSearchQuery ? undefined : initialTab;
  const [mailPage, searchPage, events, selectedThread] = await Promise.all([
    getInboxThreadPage({ maxResults: 20 }),
    normalizedSearchQuery
      ? getInboxThreadPage({ maxResults: 20, q: normalizedSearchQuery })
      : Promise.resolve({ threads: [], nextPageToken: null }),
    getCalendarWindow(now),
    selectedThreadId ? getInboxThread(selectedThreadId) : null,
  ]);
  const liveThreads =
    selectedThread &&
    !mailPage.threads.some((thread) => thread.id === selectedThread.id)
      ? [selectedThread, ...mailPage.threads]
      : mailPage.threads;
  const liveSearchThreads =
    normalizedSearchQuery &&
    selectedThread &&
    !searchPage.threads.some((thread) => thread.id === selectedThread.id)
      ? [selectedThread, ...searchPage.threads]
      : searchPage.threads;
  const commitmentThreadIds = [
    ...new Set(
      [...liveThreads, ...liveSearchThreads]
        .map((thread) => thread.id)
        .filter(Boolean),
    ),
  ];
  const commitmentByThread =
    await listActiveCommitmentsByThreadIds(commitmentThreadIds);

  const live = liveThreads.length > 0;
  const threads: Thread[] = live
    ? liveThreads.map((thread) =>
        toConsoleThread(thread, commitmentByThread.get(thread.id)),
      )
    : mockThreads.map((thread, index) => ({
        ...thread,
        id: `${thread.from}-${index}`,
        messages: [
          {
            id: `${thread.from}-${index}-message`,
            from: thread.from,
            to: null,
            body: thread.body,
            preview: thread.preview,
            time: thread.time,
            receivedAt: null,
          },
        ],
      }));
  const searchThreads: Thread[] = liveSearchThreads.map((thread) =>
    toConsoleThread(thread, commitmentByThread.get(thread.id)),
  );

  return (
    <div className="flex w-full flex-col gap-4 lg:h-full lg:min-h-0">
      <header>
        <p className="kicker">Workspace</p>
        <h1 className="mt-1.5 text-xl font-medium tracking-tight text-[var(--color-text)] sm:text-2xl">
          Mail &amp; calendar, one surface
        </h1>
      </header>

      <div className="lg:min-h-0 lg:flex-1">
        <WorkspaceConsole
          threads={threads}
          nextPageToken={live ? mailPage.nextPageToken : null}
          searchThreads={searchThreads}
          searchNextPageToken={searchPage.nextPageToken}
          searchQuery={normalizedSearchQuery ?? ""}
          initialTab={normalizedInitialTab}
          events={events}
          nowISO={now.toISOString()}
          selectedThreadId={selectedThreadId}
        />
      </div>
    </div>
  );
}
