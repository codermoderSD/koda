import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "~/server/better-auth/server";
import { createAlias, listAliases } from "~/server/koda/aliases";

const createSchema = z.object({
  alias: z.string().min(1).max(40),
  email: z.string().email(),
  label: z.string().max(80).optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const aliases = await listAliases(session.user.id);
    return NextResponse.json({ aliases });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not list aliases." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const input = createSchema.parse(await request.json());
    const alias = await createAlias({ userId: session.user.id, ...input });
    return NextResponse.json({ alias });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create alias." },
      { status: 400 },
    );
  }
}
