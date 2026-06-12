import { getCalendarWindow } from "~/server/koda/calendar";

import { CalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const now = new Date();
  const events = await getCalendarWindow(now);

  return <CalendarView events={events} nowISO={now.toISOString()} />;
}
