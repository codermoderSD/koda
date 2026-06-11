import { processWebhook } from "corsair";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { corsair } from "~/server/corsair";

export async function POST(request: NextRequest) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const body = request.headers.get("content-type")?.includes("application/json")
    ? await request.json()
    : await request.text();

  // Include tenantId if you're using multi-tenancy
  const tenantId = "shubham";

  const result = await processWebhook(corsair, headers, body, { tenantId });

  console.log("Plugin Processed", result.plugin, result.action);

  // Build response headers example Asana X-Hook-Secret header
  // any/unknown cast needed since responseheaders is a newer field not yet in the installed type definitions
  const responseHeaders = result.responseHeaders;
  const nextHeaders = new Headers();
  if (responseHeaders) {
    for (const [key, value] of Object.entries(responseHeaders)) {
      nextHeaders.set(key, value);
    }
  }

  // handle case where no webhook matched
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
