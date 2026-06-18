import { processWebhook } from "corsair";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { corsair } from "~/server/corsair";
import {
  projectGmailWebhookEvent,
  type GmailWebhookEvent,
} from "~/server/koda/gmail-projection";
import { DEFAULT_KODA_TENANT_ID } from "~/server/koda/tenant";

export async function POST(request: NextRequest) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const rawBody = await request.text();
  const contentType = request.headers.get("content-type") ?? "";

  let body: string | Record<string, unknown> = rawBody;
  if (contentType.includes("application/json")) {
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      body = rawBody;
    }
  }

  const tenantId = DEFAULT_KODA_TENANT_ID;

  const result = await processWebhook(corsair, headers, body, { tenantId });

  if (
    result.plugin === "gmail" &&
    result.response?.success &&
    result.response.data
  ) {
    await projectGmailWebhookEvent(result.response.data as GmailWebhookEvent);
  }

  const responseHeaders = result.responseHeaders;
  const nextHeaders = new Headers();
  if (responseHeaders) {
    for (const [key, value] of Object.entries(responseHeaders)) {
      nextHeaders.set(key, value);
    }
  }

  if (!result.response) {
    return NextResponse.json(
      { success: false, message: "No matching webhook found" },
      { status: 404 },
    );
  }

  if (result.response !== undefined) {
    return NextResponse.json(result.response, { headers: nextHeaders });
  }

  return new NextResponse(null, { status: 200, headers: nextHeaders });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
