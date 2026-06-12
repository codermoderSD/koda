import { NextResponse } from "next/server";
import { z } from "zod";

import { sendThreadReply } from "~/server/koda/gmail-actions";

const replySchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const input = replySchema.parse(await request.json());
    const reply = await sendThreadReply(input);
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not send reply.",
      },
      { status: 400 },
    );
  }
}
