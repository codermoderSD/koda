import { NextResponse } from "next/server";
import { z } from "zod";

import { sendEmail } from "~/server/koda/gmail-actions";

const sendSchema = z.object({
  to: z.array(z.string().min(1)).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const input = sendSchema.parse(await request.json());
    const message = await sendEmail(input);
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not send email.",
      },
      { status: 400 },
    );
  }
}
