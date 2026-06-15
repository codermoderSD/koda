import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";

import { corsair } from "~/server/corsair";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "./calendar-actions";
import { getCalendarEvents } from "./calendar";
import { searchCommitments } from "./commitments";
import { sendEmail } from "./gmail-actions";
import { getInboxThreadPage } from "./inbox";

type McpToolResult = {
  content: Array<{ type: string; text?: string }>;
};

function textFromMcpResult(result: McpToolResult) {
  return result.content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

async function runReadOnlyCorsairMcpTool({
  tenantId,
  toolName,
  args,
}: {
  tenantId: string;
  toolName: "list_operations" | "get_schema";
  args: Record<string, unknown>;
}) {
  const { buildCorsairToolDefs } = (await import(
    /* webpackIgnore: true */
    /* turbopackIgnore: true */
    "@corsair-dev/mcp"
  )) as typeof import("@corsair-dev/mcp");

  const def = buildCorsairToolDefs({
    corsair: corsair.withTenant(tenantId),
    tenantId,
    setup: false,
  }).find((candidate) => candidate.name === toolName);

  if (!def) throw new Error(`Corsair MCP tool not found: ${toolName}`);
  return textFromMcpResult(await def.handler(args));
}

function defaultCalendarWindow() {
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 45);
  return {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  };
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

function localDateWindow(date: string, timeZone: string) {
  const start = zonedTimeToUtc(date, { hour: 0, minute: 0 }, timeZone);
  const end = zonedTimeToUtc(date, { hour: 24, minute: 0 }, timeZone);
  if (!start || !end) return null;
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}

export function buildKodaAiTools(
  tenantId: string,
  options: { timeZone?: string } = {},
): ToolSet {
  const userTimeZone = options.timeZone ?? "UTC";

  return {
    corsair_list_operations: tool({
      description:
        "Read-only Corsair MCP operation discovery. Use only for Gmail and Google Calendar tool/schema discovery.",
      inputSchema: z.object({
        plugin: z.enum(["gmail", "googlecalendar"]).optional(),
        type: z.enum(["api", "webhooks", "db"]).optional(),
      }),
      execute: async ({ plugin, type }) =>
        runReadOnlyCorsairMcpTool({
          tenantId,
          toolName: "list_operations",
          args: { plugin, type },
        }),
    }),
    corsair_get_schema: tool({
      description:
        "Read-only Corsair MCP schema lookup for a Gmail or Google Calendar operation path.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "Full path, e.g. gmail.api.threads.list or googlecalendar.api.events.create",
          ),
      }),
      execute: async ({ path }) =>
        runReadOnlyCorsairMcpTool({
          tenantId,
          toolName: "get_schema",
          args: { path },
        }),
    }),
    search_email: tool({
      description:
        "Search the user's Gmail threads. Use this before answering questions about email unless the answer is already in the conversation.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Gmail search query, e.g. from:alice newer_than:30d pricing",
          ),
        maxResults: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ query, maxResults }) => {
        const page = await getInboxThreadPage({
          q: query,
          maxResults,
          tenantId,
        });
        return page.threads.map((thread) => ({
          id: thread.id,
          from: thread.from,
          to: thread.to,
          subject: thread.subject,
          preview: thread.preview,
          receivedAt: thread.receivedAt,
          messageCount: thread.messageCount,
        }));
      },
    }),
    search_calendar_events: tool({
      description: `Search Google Calendar events in a time window. For broad listings like "events today", omit query and pass date as YYYY-MM-DD in the user's local timezone. Only use query to filter by event title/details. User timezone: ${userTimeZone}.`,
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe(
            "Optional text filter for event title/details. Omit for broad day listings such as all events today.",
          ),
        date: z
          .string()
          .optional()
          .describe(
            "Local calendar date as YYYY-MM-DD. Use this for today, tomorrow, or a specific local day.",
          ),
        timeZone: z.string().optional(),
        timeMin: z.string().optional(),
        timeMax: z.string().optional(),
        maxResults: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({
        query,
        date,
        timeZone,
        timeMin,
        timeMax,
        maxResults,
      }) => {
        const fallback = defaultCalendarWindow();
        const localWindow = date
          ? localDateWindow(date, timeZone ?? userTimeZone)
          : null;
        return getCalendarEvents({
          q: query,
          timeMin: localWindow?.timeMin ?? timeMin ?? fallback.timeMin,
          timeMax: localWindow?.timeMax ?? timeMax ?? fallback.timeMax,
          maxResults,
          tenantId,
        });
      },
    }),
    search_commitments: tool({
      description:
        "Search KODA's stored extracted commitments. Use this before answering questions about commitments, owed work, promises, follow-ups, overdue items, or who owes what.",
      inputSchema: z.object({
        query: z.string().optional(),
        maxResults: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ query, maxResults }) =>
        searchCommitments(query, maxResults),
    }),
    send_email: tool({
      description:
        "Send a new Gmail message. Only call this when the user explicitly asks to send/write an email and provides or confirms recipient, subject, and body.",
      inputSchema: z.object({
        to: z.array(z.string()).min(1),
        subject: z.string().min(1),
        body: z.string().min(1),
      }),
      execute: async (input) => sendEmail({ ...input, tenantId }),
    }),
    create_calendar_event: tool({
      description: `Create a Google Calendar event. Use this only when the user asks to schedule/create/add an event. For user-local timed events, pass timeZone "${userTimeZone}" and local ISO datetime values without a trailing Z.`,
      inputSchema: z.object({
        title: z.string().min(1),
        start: z
          .string()
          .min(1)
          .describe(
            "Local ISO datetime without trailing Z for timed events, or YYYY-MM-DD for all-day events",
          ),
        end: z
          .string()
          .min(1)
          .describe(
            "Local ISO datetime without trailing Z for timed events, or YYYY-MM-DD for all-day events",
          ),
        allDay: z.boolean().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        attendees: z.array(z.string()).optional(),
        timeZone: z.string().optional(),
      }),
      execute: async (input) =>
        createCalendarEvent({
          ...input,
          timeZone: input.timeZone ?? userTimeZone,
          sendUpdates: "all",
        }),
    }),
    update_calendar_event: tool({
      description: `Update an existing Google Calendar event by event ID. Search events first if the user gave a natural-language event reference. For user-local timed events, pass timeZone "${userTimeZone}" and local ISO datetime values without a trailing Z.`,
      inputSchema: z.object({
        eventId: z.string().min(1),
        title: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        allDay: z.boolean().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        attendees: z.array(z.string()).optional(),
        timeZone: z.string().optional(),
      }),
      execute: async ({ eventId, ...patch }) =>
        updateCalendarEvent(eventId, {
          ...patch,
          timeZone: patch.timeZone ?? userTimeZone,
          sendUpdates: "all",
        }),
    }),
    delete_calendar_event: tool({
      description:
        "Delete a Google Calendar event by event ID. Only call this when the user explicitly asks to delete/cancel a specific event.",
      inputSchema: z.object({
        eventId: z.string().min(1),
      }),
      execute: async ({ eventId }) =>
        deleteCalendarEvent({ eventId, sendUpdates: "all" }),
    }),
  };
}
