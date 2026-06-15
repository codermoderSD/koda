import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "~/server/better-auth/server";
import { extractCommitmentsFromRecentEmails } from "~/server/koda/commitments";

const extractSchema = z.object({
  limit: z.number().int().min(1).max(30).optional(),
  timeZone: z.string().optional(),
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
    const input = extractSchema.parse(await request.json().catch(() => ({})));
    const result = await extractCommitmentsFromRecentEmails({
      userEmail: session.user.email,
      timeZone: input.timeZone,
      limit: input.limit,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not extract commitments.",
      },
      { status: 400 },
    );
  }
}
