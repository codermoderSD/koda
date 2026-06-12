import { getCalendarWindow } from "~/server/koda/calendar";
import { getInboxThreads } from "~/server/koda/inbox";

import { inboxThreads as mockThreads } from "../_components/mock-data";
import { WorkspaceConsole, type Thread } from "./workspace-console";

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

function priorityFor(labels: string[]) {
  if (labels.includes("UNREAD")) return "NEW";
  if (labels.includes("IMPORTANT")) return "PRIORITY";
  return "OPEN";
}

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const now = new Date();
  const [liveThreads, events] = await Promise.all([
    getInboxThreads({ maxResults: 20 }),
    getCalendarWindow(now),
  ]);

  const live = liveThreads.length > 0;
  const threads: Thread[] = live
    ? liveThreads.map((thread) => ({
        id: thread.id,
        from: thread.from,
        subject: thread.subject,
        preview: thread.preview,
        body: thread.body ?? thread.preview,
        time: formatReceivedAt(thread.receivedAt),
        priority: priorityFor(thread.labels),
      }))
    : mockThreads.map((thread, index) => ({
        ...thread,
        id: `${thread.from}-${index}`,
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
          events={events}
          nowISO={now.toISOString()}
        />
      </div>
    </div>
  );
}
