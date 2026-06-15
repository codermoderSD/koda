import { NextResponse } from "next/server";
import { z } from "zod";

import { findFreeSlots } from "~/server/koda/free-slots";

const freeSlotsSchema = z.object({
  durationMinutes: z.number().int().min(15).max(240).default(30),
  horizonDays: z.number().int().min(1).max(30).default(7),
  timeZone: z.string().min(1).default("UTC"),
  maxResults: z.number().int().min(1).max(8).default(3),
});

export async function POST(request: Request) {
  try {
    const input = freeSlotsSchema.parse(await request.json().catch(() => ({})));
    const slots = await findFreeSlots(input);
    return NextResponse.json(
      { slots },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not find free slots.",
      },
      { status: 400 },
    );
  }
}
