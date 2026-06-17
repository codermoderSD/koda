import { NextResponse } from "next/server";
import { z } from "zod";

import { createDraftCommitment } from "~/server/koda/commitments";
import { deleteEmailDraft, updateEmailDraft } from "~/server/koda/gmail-actions";

const updateDraftSchema = z.object({
  to: z.array(z.string().min(1)).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  createCommitment: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ draftId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { draftId } = await context.params;
    const input = updateDraftSchema.parse(await request.json());
    const draft = await updateEmailDraft({
      draftId: decodeURIComponent(draftId),
      to: input.to,
      subject: input.subject,
      body: input.body,
    });

    if (input.createCommitment) {
      await createDraftCommitment({
        draftId: draft.id ?? decodeURIComponent(draftId),
        to: input.to,
        subject: input.subject,
        body: input.body,
      });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update draft.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { draftId } = await context.params;
    await deleteEmailDraft({ draftId: decodeURIComponent(draftId) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not delete draft.",
      },
      { status: 400 },
    );
  }
}
