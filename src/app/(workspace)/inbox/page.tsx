import { getCalendarWindow } from "~/server/koda/calendar";
import { getInboxThreadPage, type InboxThread } from "~/server/koda/inbox";

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

function priorityFor(labels: string[]) {
  if (labels.includes("UNREAD")) return "NEW";
  if (labels.includes("IMPORTANT")) return "PRIORITY";
  return "OPEN";
}

function toConsoleThread(thread: InboxThread): Thread {
  return {
    id: thread.id,
    from: thread.from,
    to: thread.to,
    subject: thread.subject,
    preview: thread.preview,
    body: thread.body ?? thread.preview,
    time: formatReceivedAt(thread.receivedAt),
    priority: priorityFor(thread.labels),
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

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const now = new Date();
  const [mailPage, events] = await Promise.all([
    getInboxThreadPage({ maxResults: 20 }),
    getCalendarWindow(now),
  ]);
  const liveThreads = mailPage.threads;

  const live = liveThreads.length > 0;
  const threads: Thread[] = live
    ? liveThreads.map(toConsoleThread)
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
          events={events}
          nowISO={now.toISOString()}
        />
      </div>
    </div>
  );
}
