import { NextResponse } from "next/server";

import { getInboxThreadPage } from "~/server/koda/inbox";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const maxResults = Number(url.searchParams.get("maxResults") ?? 20);
  const pageToken = url.searchParams.get("pageToken") ?? undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;
  const page = await getInboxThreadPage({
    maxResults: Number.isFinite(maxResults) ? maxResults : 20,
    pageToken,
    q,
  });

  return NextResponse.json({
    threads: page.threads,
    nextPageToken: page.nextPageToken,
    count: page.threads.length,
  });
}
