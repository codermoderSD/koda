import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteCalendarEvent,
  updateCalendarEvent,
} from "~/server/koda/calendar-actions";

const sendUpdatesSchema = z.enum(["all", "externalOnly", "none"]);

const updateEventSchema = z.object({
  title: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  allDay: z.boolean().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  calendarId: z.string().optional(),
  sendUpdates: sendUpdatesSchema.optional(),
});

const deleteEventSchema = z.object({
  calendarId: z.string().optional(),
  sendUpdates: sendUpdatesSchema.optional(),
});

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const input = updateEventSchema.parse(await request.json());
    const event = await updateCalendarEvent(decodeURIComponent(eventId), input);
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update event.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const payload = request.headers
      .get("content-type")
      ?.includes("application/json")
      ? await request.json()
      : {};
    const input = deleteEventSchema.parse(payload);
    const deleted = await deleteCalendarEvent({
      eventId: decodeURIComponent(eventId),
      ...input,
    });
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not delete event.",
      },
      { status: 400 },
    );
  }
}
