import "server-only";

import { getCalendarEvents } from "./calendar";
import { getTenantId } from "./tenant";

export type FreeSlot = {
  start: string;
  end: string;
  localStart: string;
  localEnd: string;
  label: string;
};

type BusyBlock = {
  start: number;
  end: number;
};

function timeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
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
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
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
  time: { hour: number; minute: number },
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
    0,
  );
  let utc = new Date(
    localAsUtc - timeZoneOffsetMs(new Date(localAsUtc), timeZone),
  );
  utc = new Date(localAsUtc - timeZoneOffsetMs(utc, timeZone));
  return utc;
}

function localDateString(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isLocalWeekend(localDate: string, timeZone: string) {
  const localNoon = zonedTimeToUtc(
    localDate,
    { hour: 12, minute: 0 },
    timeZone,
  );
  if (!localNoon) return false;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(localNoon);
  return weekday === "Sat" || weekday === "Sun";
}

function toLocalInput(date: Date, timeZone: string) {
  const parts = timeZoneParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(
    parts.minute,
  ).padStart(2, "0")}:00`;
}

function slotLabel(start: Date, end: Date, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
  const endTime = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(end);
  return `${day}, ${time}-${endTime}`;
}

function roundUpToStep(date: Date, stepMinutes: number) {
  const ms = stepMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function overlapsBusy(start: number, end: number, busy: BusyBlock[]) {
  return busy.some((block) => start < block.end && end > block.start);
}

export async function findFreeSlots({
  durationMinutes,
  horizonDays,
  timeZone,
  tenantId,
  maxResults = 3,
}: {
  durationMinutes: number;
  horizonDays: number;
  timeZone: string;
  tenantId?: string;
  maxResults?: number;
}): Promise<FreeSlot[]> {
  const resolvedTenantId = tenantId ?? (await getTenantId());
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMaxDate = new Date(now);
  timeMaxDate.setDate(timeMaxDate.getDate() + horizonDays);

  const events = await getCalendarEvents({
    timeMin,
    timeMax: timeMaxDate.toISOString(),
    tenantId: resolvedTenantId,
    maxResults: 250,
  });
  const busy = events
    .flatMap((event): BusyBlock[] => {
      if (event.allDay || !event.start) return [];
      const start = new Date(event.start);
      const end = event.end
        ? new Date(event.end)
        : new Date(start.getTime() + 30 * 60 * 1000);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return [];
      }
      return [{ start: start.getTime(), end: end.getTime() }];
    })
    .sort((a, b) => a.start - b.start);

  const slots: FreeSlot[] = [];
  const durationMs = durationMinutes * 60 * 1000;
  const stepMinutes = durationMinutes <= 30 ? 30 : durationMinutes;
  const localToday = localDateString(now, timeZone);

  for (let day = 0; day <= horizonDays && slots.length < maxResults; day += 1) {
    const dayDate = new Date(now);
    dayDate.setDate(dayDate.getDate() + day);
    const localDate = localDateString(dayDate, timeZone);
    if (isLocalWeekend(localDate, timeZone)) continue;

    const windowStart = zonedTimeToUtc(
      localDate,
      { hour: 9, minute: 0 },
      timeZone,
    );
    const windowEnd = zonedTimeToUtc(
      localDate,
      { hour: 18, minute: 0 },
      timeZone,
    );
    if (!windowStart || !windowEnd) continue;

    let cursor =
      localDate === localToday && now > windowStart
        ? roundUpToStep(now, stepMinutes)
        : windowStart;

    while (
      cursor.getTime() + durationMs <= windowEnd.getTime() &&
      slots.length < maxResults
    ) {
      const start = cursor.getTime();
      const end = start + durationMs;
      if (start > now.getTime() && !overlapsBusy(start, end, busy)) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        slots.push({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          localStart: toLocalInput(startDate, timeZone),
          localEnd: toLocalInput(endDate, timeZone),
          label: slotLabel(startDate, endDate, timeZone),
        });
      }
      cursor = new Date(cursor.getTime() + stepMinutes * 60 * 1000);
    }
  }

  return slots;
}
