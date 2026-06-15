import "server-only";

import type { Event } from "@corsair-dev/googlecalendar";

import { corsair } from "~/server/corsair";
import { getSession } from "~/server/better-auth/server";

import { getTenantId } from "./tenant";

type CalendarEventBody = {
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
};

export type CalendarEventInput = {
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  attendees?: string[];
  timeZone?: string;
  calendarId?: string;
  sendUpdates?: "all" | "externalOnly" | "none";
};

export type CalendarEventPatch = Partial<CalendarEventInput> & {
  calendarId?: string;
};

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function normalizeAttendees(attendees: string[] | undefined) {
  const normalized = attendees
    ?.map((email) => clean(email))
    .filter((email): email is string => Boolean(email))
    .map((email) => ({ email }));
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function eventBody(input: CalendarEventPatch) {
  const allDay = Boolean(input.allDay);
  const timeZone = clean(input.timeZone);
  const body: CalendarEventBody = {};

  const title = clean(input.title);
  if (title) body.summary = title;

  const description = clean(input.description);
  if (description !== undefined) body.description = description;

  const location = clean(input.location);
  if (location !== undefined) body.location = location;

  if (input.start) {
    body.start = allDay
      ? { date: input.start.slice(0, 10) }
      : { dateTime: input.start, ...(timeZone ? { timeZone } : {}) };
  }
  if (input.end) {
    body.end = allDay
      ? { date: input.end.slice(0, 10) }
      : { dateTime: input.end, ...(timeZone ? { timeZone } : {}) };
  }

  const attendees = normalizeAttendees(input.attendees);
  if (attendees) body.attendees = attendees;

  return body;
}

function requireCreateInput(input: CalendarEventInput) {
  if (!clean(input.title)) throw new Error("Event title is required.");
  if (!clean(input.start)) throw new Error("Event start is required.");
  if (!clean(input.end)) throw new Error("Event end is required.");
}

async function requireTenantId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("You must be signed in.");
  return getTenantId();
}

export async function createCalendarEvent(input: CalendarEventInput) {
  requireCreateInput(input);

  const tenantId = await requireTenantId();
  const calendar = corsair.withTenant(tenantId).googlecalendar;
  const event = await calendar.api.events.create({
    calendarId: input.calendarId ?? "primary",
    event: eventBody(input),
    sendUpdates: input.sendUpdates ?? "all",
  });

  return mapActionEvent(event);
}

export async function updateCalendarEvent(
  eventId: string,
  patch: CalendarEventPatch,
) {
  const id = eventId.trim();
  if (!id) throw new Error("Event id is required.");

  const body = eventBody(patch);
  if (Object.keys(body).length === 0) {
    throw new Error("At least one event field is required.");
  }

  const tenantId = await requireTenantId();
  const calendar = corsair.withTenant(tenantId).googlecalendar;
  const current = await calendar.api.events.get({
    calendarId: patch.calendarId ?? "primary",
    id,
  });
  const event = await calendar.api.events.update({
    calendarId: patch.calendarId ?? "primary",
    id,
    event: {
      summary: current.summary,
      description: current.description,
      location: current.location,
      start: current.start,
      end: current.end,
      attendees: current.attendees,
      ...body,
    },
    sendUpdates: patch.sendUpdates ?? "all",
  });

  return mapActionEvent(event);
}

export async function deleteCalendarEvent(input: {
  eventId: string;
  calendarId?: string;
  sendUpdates?: "all" | "externalOnly" | "none";
}) {
  const id = input.eventId.trim();
  if (!id) throw new Error("Event id is required.");

  const tenantId = await requireTenantId();
  const calendar = corsair.withTenant(tenantId).googlecalendar;
  await calendar.api.events.delete({
    calendarId: input.calendarId ?? "primary",
    id,
    sendUpdates: input.sendUpdates ?? "all",
  });

  return { id };
}

function mapActionEvent(event: Event) {
  return {
    id: event.id ?? null,
    title: event.summary ?? "(no title)",
    start: event.start?.dateTime ?? event.start?.date ?? null,
    end: event.end?.dateTime ?? event.end?.date ?? null,
    allDay: Boolean(event.start?.date && !event.start?.dateTime),
    description: event.description ?? null,
    location: event.location ?? null,
    attendees: (event.attendees ?? [])
      .map((attendee) => attendee.email)
      .filter((email): email is string => Boolean(email)),
    meetLink: event.hangoutLink ?? null,
    status: event.status ?? "confirmed",
  };
}
