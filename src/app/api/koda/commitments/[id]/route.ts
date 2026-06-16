import { NextResponse } from "next/server";

import { getSession } from "~/server/better-auth/server";
import {
  deleteCommitment,
  resolveCommitment,
} from "~/server/koda/commitments";

type Context = { params: Promise<{ id: string }> };

async function requireSession() {
  const session = await getSession();
  return session?.user?.id ? session : null;
}

/** Mark a commitment done (status → resolved). */
export async function PATCH(_request: Request, context: Context) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    await resolveCommitment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update commitment.",
      },
      { status: 400 },
    );
  }
}

/** Permanently remove a commitment. */
export async function DELETE(_request: Request, context: Context) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    await deleteCommitment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not remove commitment.",
      },
      { status: 400 },
    );
  }
}
