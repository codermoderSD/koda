import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "~/server/better-auth/server";
import { extractCommitmentsFromThread } from "~/server/koda/commitments";

const extractThreadSchema = z.object({
  threadId: z.string().min(1),
  subject: z.string().optional().default("Untitled thread"),
  timeZone: z.string().optional(),
  messages: z
    .array(
      z.object({
        from: z.string(),
        to: z.string().nullable().optional(),
        body: z.string(),
        time: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 },
    );
  }

  try {
    const input = extractThreadSchema.parse(await request.json());
    const result = await extractCommitmentsFromThread({
      threadId: input.threadId,
      subject: input.subject,
      messages: input.messages,
      userEmail: session.user.email,
      timeZone: input.timeZone,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not extract this thread.",
      },
      { status: 400 },
    );
  }
}
