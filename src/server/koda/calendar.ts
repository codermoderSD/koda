import "server-only";

import { corsair } from "~/server/corsair";

import { getTenantId } from "./tenant";

export type KodaCalendarEvent = {
  id: string;
  title: string;
  start: string | null; // ISO datetime, or YYYY-MM-DD for all-day
  end: string | null;
  allDay: boolean;
  location: string | null;
  attendees: string[];
  meetLink: string | null;
  status: string;
};

type RawEvent = {
  id?: string;
  summary?: string;
  status?: string;
  location?: string;
  hangoutLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: Array<{ email?: string }>;
};

function mapEvent(e: RawEvent): KodaCalendarEvent[] {
  if (!e.id) return [];
  if (e.status === "cancelled") return [];

  const allDay = Boolean(e.start?.date && !e.start?.dateTime);

  return [
    {
      id: e.id,
      title: e.summary?.trim() || "(no title)",
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
      allDay,
      location: e.location ?? null,
      attendees: (e.attendees ?? [])
        .map((a) => a.email)
        .filter((x): x is string => Boolean(x)),
      meetLink: e.hangoutLink ?? null,
      status: e.status ?? "confirmed",
    },
  ];
}

export async function getCalendarEvents(options: {
  timeMin: string;
  timeMax: string;
  maxResults?: number;
  tenantId?: string;
}): Promise<KodaCalendarEvent[]> {
  const tenantId = options.tenantId ?? (await getTenantId());

  try {
    const calendar = corsair.withTenant(tenantId).googlecalendar;

    const response = (await calendar.api.events.getMany({
      calendarId: "primary",
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: options.maxResults ?? 250,
    })) as { items?: RawEvent[] };

    return (response.items ?? []).flatMap(mapEvent);
  } catch {
    return [];
  }
}

/** Fetches events spanning a window around `now` wide enough for week/month nav. */
export async function getCalendarWindow(now: Date, tenantId?: string) {
  const min = new Date(now);
  min.setDate(min.getDate() - 31);
  const max = new Date(now);
  max.setDate(max.getDate() + 45);

  return getCalendarEvents({
    timeMin: min.toISOString(),
    timeMax: max.toISOString(),
    tenantId,
  });
}
