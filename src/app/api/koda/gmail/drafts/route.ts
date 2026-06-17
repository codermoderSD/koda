import { NextResponse } from "next/server";

import { listEmailDrafts } from "~/server/koda/gmail-actions";

export async function GET() {
  try {
    const drafts = await listEmailDrafts({ maxResults: 10 });
    return NextResponse.json({ drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not list drafts.",
      },
      { status: 400 },
    );
  }
}
