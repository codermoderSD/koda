import { NextResponse } from "next/server";
import { z } from "zod";

import { sendEmailDraft } from "~/server/koda/gmail-actions";

const sendDraftSchema = z
  .object({
    to: z.array(z.string().min(1)).min(1).optional(),
    subject: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
  })
  .optional();

type RouteContext = {
  params: Promise<{ draftId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { draftId } = await context.params;
    const payload: unknown = request.headers
      .get("content-type")
      ?.includes("application/json")
      ? await request.json()
      : undefined;
    const input = sendDraftSchema.parse(payload);
    const message = await sendEmailDraft({
      draftId: decodeURIComponent(draftId),
      to: input?.to,
      subject: input?.subject,
      body: input?.body,
    });
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not send draft.",
      },
      { status: 400 },
    );
  }
}
