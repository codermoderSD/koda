import { NextResponse } from "next/server";
import { z } from "zod";

import { saveEmailDraft } from "~/server/koda/gmail-actions";

const draftSchema = z.object({
  to: z.array(z.string().min(1)).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1),
        mimeType: z.string().min(1),
        data: z.string().min(1),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const input = draftSchema.parse(await request.json());
    const draft = await saveEmailDraft(input);
    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not save draft.",
      },
      { status: 400 },
    );
  }
}
