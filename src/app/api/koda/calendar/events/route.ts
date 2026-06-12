import { NextResponse } from "next/server";
import { z } from "zod";

import { createCalendarEvent } from "~/server/koda/calendar-actions";

const sendUpdatesSchema = z.enum(["all", "externalOnly", "none"]);

const createEventSchema = z.object({
  title: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  allDay: z.boolean().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  calendarId: z.string().optional(),
  sendUpdates: sendUpdatesSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const input = createEventSchema.parse(await request.json());
    const event = await createCalendarEvent(input);
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create event.",
      },
      { status: 400 },
    );
  }
}
