import { NextResponse } from "next/server";

import { getSession } from "~/server/better-auth/server";
import { deleteAlias } from "~/server/koda/aliases";

type RouteContext = { params: Promise<{ aliasId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { aliasId } = await context.params;
    await deleteAlias({ userId: session.user.id, aliasId: decodeURIComponent(aliasId) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete alias." },
      { status: 400 },
    );
  }
}
