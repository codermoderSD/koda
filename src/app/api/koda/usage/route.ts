import { NextResponse } from "next/server";

import { getSession } from "~/server/better-auth/server";
import { getAiQuota } from "~/server/koda/usage";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const quota = await getAiQuota(session.user.id);
  return NextResponse.json(quota);
}
