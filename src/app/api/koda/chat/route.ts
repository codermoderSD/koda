import { generateText, stepCountIs } from "ai";
import { groq } from "@ai-sdk/groq";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "~/env";
import { getSession } from "~/server/better-auth/server";
import { buildKodaAiTools } from "~/server/koda/ai-tools";
import {
  getCalendarEvents,
  type KodaCalendarEvent,
} from "~/server/koda/calendar";
import { getInboxThreadPage } from "~/server/koda/inbox";
import { consumeAiQuota, getAiQuota } from "~/server/koda/usage";

const chatSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(["ask", "search", "draft", "schedule"]).optional(),
  timeZone: z.string().min(1).optional(),
  // Prior turns of the in-memory conversation, oldest first. Lets follow-ups
  // resolve against earlier prompts/answers. Cleared when the chat is closed.
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .optional(),
  activeThread: z
    .object({
      id: z.string().min(1),
      subject: z.string(),
      from: z.string(),
      to: z.string().nullable().optional(),
      messages: z.array(
        z.object({
          from: z.string(),
          to: z.string().nullable().optional(),
          body: z.string(),
          time: z.string(),
        }),
      ),
    })
    .nullable()
    .optional(),
});

type ChatStatus = "success" | "needs_input" | "requires_confirmation" | "error";

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
      type: "confirm_action";
      label: string;
      action:
        | { type: "delete_event"; eventId: string }
        | { type: "send_reply"; threadId: string; body: string };
    }
  | { type: "input"; label: string; name: string; placeholder?: string };

type KodaChatResponse = {
  status: ChatStatus;
  message: string;
  retainPrompt?: boolean;
  refresh?: Array<"inbox" | "calendar">;
  components?: KodaResponseComponent[];
};

async function successfulChatResponse(
  userId: string,
  response: KodaChatResponse,
) {
  if (response.status !== "error") {
    await consumeAiQuota(userId);
  }
  return NextResponse.json(response);
}

function normalizeTimeZone(timeZone: string | undefined) {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

function normalizePromptTimeText(message: string) {
  return message.replace(
    /\b(\d{1,2})\.(\d{2})\s*([ap])\.?m\.?\b/gi,
    (_, hour: string, minute: string, period: string) =>
      `${hour}:${minute}${period.toLowerCase()}m`,
  );
}

function stripLegacyCommand(message: string) {
  const match = /^\/(ask|search|draft|schedule)\s+([\s\S]*)$/i.exec(message);
  return match
    ? {
        mode: match[1]!.toLowerCase() as z.infer<typeof chatSchema>["mode"],
        message: match[2]!.trim(),
      }
    : { mode: undefined, message };
}

function localDateString(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function localDateFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function timeZoneParts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== "literal") parts[part.type] = part.value;
      return parts;
    }, {});

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = timeZoneParts(date, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return localAsUtc - date.getTime();
}

function zonedTimeToUtc(
  date: string,
  time: { hour: number; minute: number; second?: number },
  timeZone: string,
) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const [, year, month, day] = match;
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    time.hour,
    time.minute,
    time.second ?? 0,
  );
  let utc = new Date(
    localAsUtc - timeZoneOffsetMs(new Date(localAsUtc), timeZone),
  );
  utc = new Date(localAsUtc - timeZoneOffsetMs(utc, timeZone));
  return utc;
}

function wantsActiveReply(message: string) {
  return (
    /\b(reply|respond|write back|draft)\b/i.test(message) &&
    /\b(active|opened|selected|this)\b/i.test(message) &&
    /\b(email|mail|thread|message)\b/i.test(message)
  );
}

function wantsReplyIntent(message: string) {
  return /\b(reply|respond|write back|draft\s+(?:a\s+)?reply|write\s+(?:a\s+)?reply)\b/i.test(
    message,
  );
}

function wantsActiveThreadDraftIntent(message: string) {
  if (extractEmailAddress(message) && /\b(send|email|mail)\b/i.test(message)) {
    return false;
  }
  return /\b(ask|question|clarify|follow(?:\s|-)?up|similar)\b/i.test(message);
}

function wantsCalendarDelete(message: string) {
  return (
    /\b(delete|cancel|remove)\b/i.test(message) &&
    /\b(calendar|event|meeting|invite)\b/i.test(message)
  );
}

function wantsCalendarEdit(message: string) {
  return (
    /\b(update|edit|reschedule|move|change)\b/i.test(message) &&
    /\b(calendar|event|meeting|invite)\b/i.test(message)
  );
}

function localTimeLabel(value: string | null, timeZone: string) {
  if (!value) return "No time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
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

function mapThreadSummary(
  thread: Awaited<ReturnType<typeof getInboxThreadPage>>["threads"][number],
): ThreadSummary {
  return {
    id: thread.id,
    from: thread.from,
    to: thread.to,
    subject: thread.subject,
    preview: thread.preview,
    time: thread.receivedAt,
    priority: priorityFor(thread.labels),
    messages: thread.messages.map((message) => ({
      id: message.id,
      from: message.from,
      to: message.to,
      body: message.body,
      preview: message.preview,
      time: message.receivedAt,
      receivedAt: message.receivedAt,
    })),
  };
}

function mapEventSummary(
  event: Awaited<ReturnType<typeof getCalendarEvents>>[number],
): EventSummary {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    location: event.location,
  };
}

const EVENT_SEARCH_STOP_WORDS = new Set([
  "add",
  "able",
  "also",
  "and",
  "attendee",
  "attendees",
  "calendar",
  "can",
  "cancel",
  "change",
  "could",
  "delete",
  "edit",
  "event",
  "for",
  "from",
  "guest",
  "guests",
  "half",
  "hour",
  "hours",
  "into",
  "invite",
  "make",
  "meeting",
  "mins",
  "minute",
  "minutes",
  "move",
  "need",
  "needs",
  "name",
  "named",
  "onto",
  "put",
  "please",
  "remove",
  "reschedule",
  "schedule",
  "should",
  "that",
  "the",
  "this",
  "time",
  "today",
  "tomorrow",
  "too",
  "update",
  "want",
  "wants",
  "with",
  "would",
  "you",
  "your",
]);

function eventSearchTerms(message: string) {
  return message
    .toLowerCase()
    .replace(/\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\b/g, " ")
    .replace(/\b\d{1,2}\s*(?:am|pm)\b/g, " ")
    .replace(/\b\d+\s*(?:minutes?|mins?|hours?|hrs?)\b/g, " ")
    .replace(/\bhalf\s+(?:an?\s+)?hour\b/g, " ")
    .replace(/\bevent\s+name\s+or\s+time\s*:/g, " ")
    .replace(/^\/\w+\s+/, "")
    .split(/[^a-z0-9@._-]+/)
    .map((term) => term.trim())
    .filter(
      (term) =>
        term.length > 2 &&
        !EVENT_SEARCH_STOP_WORDS.has(term) &&
        !/^\d+$/.test(term) &&
        !/^\d+(?:am|pm)$/.test(term),
    );
}

function uniqueTerms(terms: string[]) {
  return [...new Set(terms)];
}

function targetLocalDateForMessage(message: string, timeZone: string) {
  const now = new Date();
  if (/\btoday(?:'s)?\b/i.test(message)) return localDateFor(now, timeZone);
  if (/\btomorrow(?:'s)?\b/i.test(message)) {
    return localDateFor(
      new Date(now.getTime() + 24 * 60 * 60 * 1000),
      timeZone,
    );
  }
  return null;
}

function eventSearchableText(event: KodaCalendarEvent) {
  return [
    event.title,
    event.description ?? "",
    event.location ?? "",
    ...event.attendees,
  ]
    .join(" ")
    .toLowerCase();
}

function findRelevantCalendarEvents({
  events,
  message,
  timeZone,
}: {
  events: KodaCalendarEvent[];
  message: string;
  timeZone: string;
}) {
  const terms = uniqueTerms(eventSearchTerms(message));
  const targetLocalDate = targetLocalDateForMessage(message, timeZone);
  const titleNeedle = terms.join(" ");

  const scored = events
    .map((event) => {
      const title = event.title.toLowerCase();
      const searchable = eventSearchableText(event);
      const eventLocalDate = event.start
        ? localDateFor(new Date(event.start), timeZone)
        : null;
      let score = 0;
      let termMatched = false;
      const dateMatched = Boolean(
        targetLocalDate && eventLocalDate === targetLocalDate,
      );

      if (terms.length === 0) score += 1;
      for (const term of terms) {
        if (title.includes(term)) {
          score += 8;
          termMatched = true;
        } else if (searchable.includes(term)) {
          score += 4;
          termMatched = true;
        }
      }

      if (titleNeedle && title === titleNeedle) score += 12;
      if (titleNeedle && title.includes(titleNeedle)) score += 6;
      if (dateMatched) score += 6;
      if (targetLocalDate && !dateMatched) score -= termMatched ? 1 : 4;

      return { event, score, termMatched, dateMatched };
    })
    .filter(({ score, termMatched, dateMatched }) => {
      if (terms.length === 0) return dateMatched || score > 0;
      return score >= 4 && (termMatched || dateMatched);
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aStart = a.event.start ? new Date(a.event.start).getTime() : 0;
      const bStart = b.event.start ? new Date(b.event.start).getTime() : 0;
      return aStart - bStart;
    });

  const [top, second] = scored;
  if (
    top?.termMatched &&
    top.score >= 8 &&
    (!second || top.score - second.score >= 6)
  ) {
    return [top.event];
  }

  return scored.map((item) => item.event).slice(0, 10);
}

function wantsEmailSearch(message: string) {
  const lower = message.toLowerCase();
  if (/\b(send|write|compose|draft|reply|respond)\b/.test(lower)) {
    return false;
  }
  return (
    (/\b(search|find|show|list|what|which|how many)\b/.test(lower) ||
      /^\s*(emails?|mail|messages?)\b/.test(lower)) &&
    mentionsEmail(lower)
  );
}

function wantsCalendarSearch(message: string) {
  const lower = message.toLowerCase();
  if (
    /\b(create|schedule|add|update|edit|reschedule|delete|cancel|remove)\b/.test(
      lower,
    )
  ) {
    return false;
  }
  return (
    /\b(search|find|show|list|what|which|how many)\b/.test(lower) &&
    mentionsCalendar(lower)
  );
}

function mentionsEmail(message: string) {
  return /\b(email|emails|mail|message|messages|inbox|from|to|sent|received)\b/.test(
    message,
  );
}

function mentionsCalendar(message: string) {
  return /\b(event|events|calendar|meeting|meetings|invite|invites)\b/.test(
    message,
  );
}

function extractEmailAddress(message: string) {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(message)?.[0];
}

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function extractHeaderEmail(value: string) {
  const match = /<([^>]+)>/.exec(value);
  return cleanHeader(match?.[1] ?? value).toLowerCase();
}

function splitAddresses(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => cleanHeader(part))
    .filter(Boolean);
}

function chooseActiveThreadReplyRecipient(
  activeThread: NonNullable<z.infer<typeof chatSchema>["activeThread"]>,
  selfEmail: string,
) {
  const self = selfEmail.toLowerCase();

  for (let index = activeThread.messages.length - 1; index >= 0; index -= 1) {
    const message = activeThread.messages[index];
    if (!message) continue;

    const from = splitAddresses(message.from).filter(
      (address) => extractHeaderEmail(address) !== self,
    );
    if (from.length > 0) return from.join(", ");

    const to = splitAddresses(message.to).filter(
      (address) => extractHeaderEmail(address) !== self,
    );
    if (to.length > 0) return to.join(", ");
  }

  const fallbackFrom = splitAddresses(activeThread.from).filter(
    (address) => extractHeaderEmail(address) !== self,
  );
  if (fallbackFrom.length > 0) return fallbackFrom.join(", ");

  return splitAddresses(activeThread.to)
    .filter((address) => extractHeaderEmail(address) !== self)
    .join(", ");
}

function gmailQueryFromMessage(message: string) {
  const email = extractEmailAddress(message);
  const lower = message.toLowerCase();
  if (email && /\b(sent to|to)\b/i.test(message)) return `to:${email}`;
  if (email && /\b(from|sent by)\b/i.test(message)) return `from:${email}`;
  if (email) return email;

  return lower
    .replace(/^\/\w+\s+/, "")
    .replace(
      /\b(search|find|show|list|emails?|mail|inbox|sent|received)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function calendarWindowForMessage(message: string, timeZone: string) {
  const now = new Date();
  const localDate = /\btomorrow\b/i.test(message)
    ? localDateFor(new Date(now.getTime() + 24 * 60 * 60 * 1000), timeZone)
    : /\btoday\b/i.test(message)
      ? localDateFor(now, timeZone)
      : null;

  if (localDate) {
    const start = zonedTimeToUtc(localDate, { hour: 0, minute: 0 }, timeZone);
    const end = zonedTimeToUtc(localDate, { hour: 24, minute: 0 }, timeZone);
    if (!start || !end) throw new Error("Could not build calendar day window.");
    return {
      localDate,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    };
  }

  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 14);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 60);
  return {
    localDate: null,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  };
}

function modeInstructions(mode: z.infer<typeof chatSchema>["mode"]) {
  switch (mode) {
    case "search":
      return `Command mode: /search
- You must call a search tool before answering.
- For Gmail/mail/email queries, call search_email. For "emails sent to X", use Gmail query "to:X". For "emails from X", use "from:X".
- For Calendar/event queries, call search_calendar_events. For broad listings like "calendar events today", omit query and pass date as the user's current local date.
- After tool results, answer with the count and list the relevant subjects or event names with dates/times.`;
    case "schedule":
      return `Command mode: /schedule
- Use calendar tools for create/update/delete calendar requests.
- For natural-language update/delete references, search_calendar_events first. If exactly one matching event is found, act. If multiple match, ask one short clarification.`;
    case "draft":
      return `Command mode: /draft
- Use Gmail tools for email requests. Do not send unless the user explicitly asks to send and recipient, subject, and body are clear.
- If the request needs existing email context, search_email first.`;
    case "ask":
    default:
      return `Command mode: /ask
- If the answer depends on live Gmail, Calendar, or stored commitment data, call the relevant search tool before answering.`;
  }
}

function toolPolicy(mode: z.infer<typeof chatSchema>["mode"], message: string) {
  const lower = message.toLowerCase();
  if (
    mode === "search" ||
    (/\b(search|find|show|list|how many|what)\b/.test(lower) &&
      /\b(email|mail|inbox|calendar|event|meeting|commitment|commitments|owe|owed|promised|follow-up|followup)\b/.test(
        lower,
      ))
  ) {
    return {
      activeTools: [
        "search_email",
        "search_calendar_events",
        "search_commitments",
      ],
      toolChoice: "required" as const,
    };
  }

  if (
    mode === "schedule" ||
    (/\b(update|edit|reschedule|create|schedule|add)\b/.test(lower) &&
      /\b(calendar|event|meeting|invite)\b/.test(lower))
  ) {
    return {
      activeTools: [
        "search_calendar_events",
        "create_calendar_event",
        "update_calendar_event",
      ],
      toolChoice:
        mode === "schedule" ? ("required" as const) : ("auto" as const),
    };
  }

  return {};
}

function refreshHints(message: string): Array<"inbox" | "calendar"> {
  const lower = message.toLowerCase();
  const refresh = new Set<"inbox" | "calendar">();
  if (
    /\b(schedule|reschedule)\b/.test(lower) ||
    (/\b(create|add|update|edit|move|change|delete|cancel|remove)\b/.test(
      lower,
    ) &&
      /\b(calendar|event|meeting|invite|appointment|reminder)\b/.test(lower))
  ) {
    refresh.add("calendar");
  }
  if (
    /\b(send|reply|respond|write|compose)\b/.test(lower) &&
    /\b(email|mail|message|reply|respond|send)\b/.test(lower)
  ) {
    refresh.add("inbox");
  }
  return [...refresh];
}

async function draftActiveThreadReply({
  message,
  activeThread,
  user,
}: {
  message: string;
  activeThread: NonNullable<z.infer<typeof chatSchema>["activeThread"]>;
  user: { email: string; name?: string | null };
}) {
  const recipient = chooseActiveThreadReplyRecipient(activeThread, user.email);
  if (!recipient) {
    return {
      status: "needs_input" as const,
      message:
        "I could not determine who to reply to in the active thread. Tell me the recipient.",
      retainPrompt: true,
      components: [
        {
          type: "input" as const,
          label: "Reply recipient",
          name: "recipient",
          placeholder: "name@example.com",
        },
      ],
    };
  }

  const threadText = activeThread.messages
    .map(
      (item, index) =>
        `Message ${index + 1}
From: ${item.from}
To: ${item.to ?? ""}
Time: ${item.time}
Body:
${item.body}`,
    )
    .join("\n\n---\n\n");

  const result = await generateText({
    model: groq(env.KODA_AI_MODEL ?? "llama-3.3-70b-versatile"),
    system: `You draft concise Gmail replies for ${user.name ?? user.email} <${user.email}>.
Return only the reply body. Do not include a subject, greeting labels, markdown fences, or commentary.
Use the active thread context. If the user did not specify tone or details, write a professional, useful reply based on the latest email.`,
    prompt: `User request: ${message}

Active thread subject: ${activeThread.subject}
Active thread from: ${activeThread.from}
Active thread to: ${activeThread.to ?? ""}
Reply recipient: ${recipient}

Thread:
${threadText}`,
  });

  return {
    status: "requires_confirmation" as const,
    message: "I drafted a reply. Review it before sending.",
    components: [
      {
        type: "draft_reply" as const,
        threadId: activeThread.id,
        subject: activeThread.subject,
        to: recipient,
        body: result.text.trim(),
      },
    ],
  };
}

async function searchEmail({
  message,
  tenantId,
}: {
  message: string;
  tenantId: string;
}) {
  const query = gmailQueryFromMessage(message);
  const page = await getInboxThreadPage({
    q: query || undefined,
    maxResults: 20,
    tenantId,
  });
  const threads = page.threads.map(mapThreadSummary);
  return {
    status: "success" as const,
    message:
      threads.length === 0
        ? "No matching emails found."
        : `Found ${threads.length} matching email${threads.length === 1 ? "" : "s"}.`,
    components: [
      {
        type: "email_results" as const,
        query: query || message,
        threads,
      },
    ],
  };
}

async function searchCalendar({
  message,
  tenantId,
  timeZone,
}: {
  message: string;
  tenantId: string;
  timeZone: string;
}) {
  const window = calendarWindowForMessage(message, timeZone);
  const events = await getCalendarEvents({
    timeMin: window.timeMin,
    timeMax: window.timeMax,
    maxResults: 50,
    tenantId,
  });
  const summaries = events.map(mapEventSummary);
  return {
    status: "success" as const,
    message:
      summaries.length === 0
        ? "No matching calendar events found."
        : `Found ${summaries.length} calendar event${summaries.length === 1 ? "" : "s"}.`,
    components: [
      {
        type: "event_results" as const,
        query: window.localDate ? `date:${window.localDate}` : message,
        events: summaries,
        selection: "single" as const,
        intent: "inspect" as const,
      },
    ],
  };
}

async function prepareCalendarDelete({
  message,
  tenantId,
  timeZone,
}: {
  message: string;
  tenantId: string;
  timeZone: string;
}) {
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 14);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 60);

  const events = await getCalendarEvents({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: 50,
    tenantId,
  });

  const candidates = findRelevantCalendarEvents({
    events,
    message,
    timeZone,
  });

  if (candidates.length === 1) {
    const event = candidates[0]!;
    return {
      status: "requires_confirmation" as const,
      message: "I found one matching event. Confirm before deleting it.",
      components: [
        {
          type: "event_results" as const,
          query: message,
          events: [mapEventSummary(event)],
          selection: "single" as const,
          intent: "delete" as const,
        },
        {
          type: "confirm_action" as const,
          label: `Delete ${event.title}`,
          action: { type: "delete_event" as const, eventId: event.id },
        },
      ],
    };
  }

  if (candidates.length > 1) {
    return {
      status: "needs_input" as const,
      message: `I found ${candidates.length} matching events. Select the one to delete.`,
      retainPrompt: true,
      components: [
        {
          type: "event_results" as const,
          query: message,
          events: candidates.map(mapEventSummary),
          selection: "single" as const,
          intent: "delete" as const,
        },
      ],
    };
  }

  return {
    status: "needs_input" as const,
    message:
      "I could not find a matching event to delete. Tell me the event name or date/time.",
    retainPrompt: true,
    components: [
      {
        type: "input" as const,
        label: "Event name or time",
        name: "event",
        placeholder: "e.g. Product sync today at 4pm",
      },
    ],
  };
}

async function prepareCalendarEdit({
  message,
  tenantId,
  timeZone,
}: {
  message: string;
  tenantId: string;
  timeZone: string;
}) {
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 14);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 60);

  const events = await getCalendarEvents({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: 50,
    tenantId,
  });

  const candidates = findRelevantCalendarEvents({
    events,
    message,
    timeZone,
  });

  if (candidates.length > 0) {
    return {
      status: "needs_input" as const,
      message:
        candidates.length === 1
          ? "I found one matching event. Open it to edit the details."
          : `I found ${candidates.length} matching events. Select the one to edit.`,
      retainPrompt: true,
      components: [
        {
          type: "event_results" as const,
          query: message,
          events: candidates.map(mapEventSummary),
          selection: "single" as const,
          intent: "edit" as const,
        },
      ],
    };
  }

  return {
    status: "needs_input" as const,
    message:
      "I could not find a matching event to edit. Tell me the event name or date/time.",
    retainPrompt: true,
    components: [
      {
        type: "input" as const,
        label: "Event name or time",
        name: "event",
        placeholder: "e.g. Product sync today at 4pm",
      },
    ],
  };
}

function systemPrompt(
  user: {
    id: string;
    email: string;
    name?: string | null;
  },
  timeZone: string,
) {
  const now = new Date();
  const localNow = new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "full",
    timeStyle: "long",
    hour12: false,
  }).format(now);
  const localDate = localDateString(timeZone);

  return `You are KODA, an execution layer for the user's Gmail and Google Calendar.

Current UTC timestamp: ${now.toISOString()}
User timezone: ${timeZone}
Current local date for user: ${localDate}
Current local time for user: ${localNow}
User: ${user.name ?? user.email} <${user.email}>
Tenant id: ${user.id}

You can search Gmail, search Calendar, search stored commitments, send Gmail messages, and create/update/delete Calendar events using tools.

Rules:
- Be concise and operational. Do not mention implementation internals unless asked.
- Use tools when the user asks about live email/calendar data or asks you to perform an action.
- Use search_commitments when the user asks about commitments, owed work, promises, follow-ups, overdue items, or who owes what.
- For destructive calendar deletes, only proceed if the user's request is explicit and the event is specific. If ambiguous, ask a short clarification instead.
- For natural-language calendar update/delete requests, search events first. If exactly one event matches, act. If zero or multiple events match, answer with the candidate count and ask one short clarification.
- Gmail delete/archive is not available yet. If asked to delete email, say that Gmail delete is not supported in KODA yet.
- Never report "0" live emails/events unless the relevant search tool returned an empty result.
- Ask at most one concise follow-up question when required context is missing or ambiguous. Do not ask a follow-up when the request contains enough context to act.
- For sending email, do not invent recipients. If recipient, subject, or body cannot be inferred from the request, ask for the missing field.
- If the user asks to reply/respond/write back to an active/open/selected thread, draft a reply for confirmation. Do not call send_email for active-thread replies.
- For scheduling, all relative dates and times such as today, tomorrow, tonight, or 9:30pm refer to the user's timezone, not UTC or server time.
- For Calendar searches by local day, use search_calendar_events with date "${localDate}" for today instead of manually constructing UTC timeMin/timeMax. For broad listings like "events today", omit the query field so it does not filter out events by title text.
- Preserve explicit minutes exactly. Interpret "9.30pm" or "9:30pm" as 21:30, never as 21:00, and do not round start/end times unless the user asks you to.
- When creating or updating timed Calendar events from user-local times, pass the user's timezone and local ISO datetime values without a trailing Z, for example start "2026-06-12T21:30:00" with timeZone "${timeZone}".
- Required scheduling fields are title/purpose, date, time, and duration/end. If any required field is missing and cannot be inferred, ask one follow-up.
- Commitment extraction stores only what has already been extracted. If no commitments are found, say none are stored yet and suggest running extraction from the Commitments page.`;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured." },
        { status: 500 },
      );
    }

    // Daily per-user AI request quota. Only successful requests are charged.
    const quota = await getAiQuota(session.user.id);
    if (quota.remaining <= 0) {
      const message = `Daily limit reached — you've used all ${quota.limit} KODA requests for today. Try again tomorrow.`;
      return NextResponse.json(
        {
          status: "error",
          message,
          retainPrompt: true,
          components: [{ type: "text", text: message }],
        },
        { status: 429 },
      );
    }

    const input = chatSchema.parse(await request.json());
    const timeZone = normalizeTimeZone(input.timeZone);
    const normalizedInput = normalizePromptTimeText(input.message);
    const legacy = stripLegacyCommand(normalizedInput);
    const mode = input.mode ?? legacy.mode;
    const normalizedMessage = legacy.message;

    if (
      wantsActiveReply(normalizedMessage) ||
      (input.activeThread &&
        (wantsReplyIntent(normalizedMessage) ||
          wantsActiveThreadDraftIntent(normalizedMessage)))
    ) {
      if (!input.activeThread) {
        return successfulChatResponse(session.user.id, {
          status: "needs_input",
          message:
            "Open an email thread first, then ask me to draft the reply.",
          retainPrompt: true,
          components: [
            {
              type: "text",
              text: "Open an email thread first, then ask me to draft the reply.",
            },
          ],
        });
      }
      return successfulChatResponse(
        session.user.id,
        await draftActiveThreadReply({
          message: normalizedMessage,
          activeThread: input.activeThread,
          user: session.user,
        }),
      );
    }

    if (wantsCalendarDelete(normalizedMessage)) {
      return successfulChatResponse(
        session.user.id,
        await prepareCalendarDelete({
          message: normalizedMessage,
          tenantId: session.user.id,
          timeZone,
        }),
      );
    }

    if (wantsCalendarEdit(normalizedMessage)) {
      return successfulChatResponse(
        session.user.id,
        await prepareCalendarEdit({
          message: normalizedMessage,
          tenantId: session.user.id,
          timeZone,
        }),
      );
    }

    if (
      wantsCalendarSearch(normalizedMessage) ||
      (mode === "search" && mentionsCalendar(normalizedMessage.toLowerCase()))
    ) {
      return successfulChatResponse(
        session.user.id,
        await searchCalendar({
          message: normalizedMessage,
          tenantId: session.user.id,
          timeZone,
        }),
      );
    }

    if (
      wantsEmailSearch(normalizedMessage) ||
      (mode === "search" && mentionsEmail(normalizedMessage.toLowerCase()))
    ) {
      return successfulChatResponse(
        session.user.id,
        await searchEmail({
          message: normalizedMessage,
          tenantId: session.user.id,
        }),
      );
    }

    const policy = toolPolicy(mode, normalizedMessage);
    const prompt = mode
      ? `${modeInstructions(mode)}\n\nUser request: ${normalizedMessage}`
      : normalizedMessage;

    // Carry the prior conversation so follow-ups have context. The current
    // prompt is appended as the final user turn.
    const priorTurns = (input.history ?? [])
      .filter((turn) => turn.content.trim().length > 0)
      .map((turn) => ({ role: turn.role, content: turn.content }));

    const result = await generateText({
      model: groq(env.KODA_AI_MODEL ?? "llama-3.3-70b-versatile"),
      system: systemPrompt(session.user, timeZone),
      messages: [...priorTurns, { role: "user" as const, content: prompt }],
      tools: buildKodaAiTools(session.user.id, { timeZone }),
      ...policy,
      stopWhen: stepCountIs(8),
    });

    return successfulChatResponse(session.user.id, {
      status: "success",
      message: result.text,
      refresh: refreshHints(normalizedMessage),
      components: [{ type: "text", text: result.text }],
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const message = friendlyChatError(raw);
    return NextResponse.json(
      {
        status: "error",
        message,
        retainPrompt: true,
        components: [{ type: "text", text: message }],
      },
      { status: 400 },
    );
  }
}

/** Map noisy provider errors to short, human messages for the chat UI. */
function friendlyChatError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("tokens per day")) {
    return "KODA is busy right now (model rate limit). Give it a minute and try again.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "That took too long. Please try again.";
  }
  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "Network hiccup reaching the AI. Please try again.";
  }
  return "Something went wrong running that. Please try again.";
}
