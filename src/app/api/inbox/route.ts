import { NextResponse } from "next/server";

import { getInboxThreads } from "~/server/koda/inbox";

export async function GET() {
  const threads = await getInboxThreads();

  return NextResponse.json({
    threads,
    count: threads.length,
  });
}
