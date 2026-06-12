import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { emails, webhookEvents } from "~/server/db/schema";

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePart = {
  mimeType?: string;
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
};

type GmailMessage = {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string | number | Date | null;
  payload?: {
    headers?: GmailHeader[];
    mimeType?: string;
    body?: {
      data?: string;
    };
    parts?: GmailMessagePart[];
  };
  subject?: string;
  from?: string;
  to?: string;
  body?: string;
  raw?: string;
};

export type GmailWebhookEvent =
  | {
      type: "messageReceived";
      emailAddress: string;
      historyId: string;
      message: GmailMessage;
    }
  | {
      type: "messageDeleted";
      emailAddress: string;
      historyId: string;
      message: GmailMessage;
    }
  | {
      type: "messageLabelChanged";
      emailAddress: string;
      historyId: string;
      message: GmailMessage;
      labelsAdded?: string[];
      labelsRemoved?: string[];
    };

function readHeader(
  headers: GmailHeader[] | undefined,
  headerName: string,
): string | undefined {
  return headers?.find(
    (header) => header.name?.toLowerCase() === headerName.toLowerCase(),
  )?.value;
}

function decodeBody(data: string | undefined): string | undefined {
  if (!data) return undefined;

  try {
    return Buffer.from(data, "base64").toString("utf-8");
  } catch {
    return undefined;
  }
}

function readBody(part: GmailMessagePart | undefined): string | undefined {
  if (!part) return undefined;

  const directBody = decodeBody(part.body?.data);
  if (directBody) return directBody;

  for (const child of part.parts ?? []) {
    const nestedBody = readBody(child);
    if (nestedBody) return nestedBody;
  }

  return undefined;
}

function normalizeDate(
  value: GmailMessage["internalDate"],
): Date | null | undefined {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isNaN(numericValue)) {
    const numericDate = new Date(numericValue);
    if (!Number.isNaN(numericDate.getTime())) return numericDate;
  }

  const parsedDate = new Date(String(value));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function messageBody(message: GmailMessage): string | undefined {
  if (message.body) return message.body;
  return readBody(message.payload);
}

function toAddresses(message: GmailMessage, headerTo: string | undefined) {
  const value = message.to ?? headerTo;
  return value ? [value] : [];
}

function computeEventKey(event: GmailWebhookEvent) {
  return [
    "gmail",
    event.type,
    event.historyId,
    event.message.id ?? event.message.threadId ?? "unknown",
  ].join(":");
}

export async function projectGmailWebhookEvent(event: GmailWebhookEvent) {
  const eventKey = computeEventKey(event);

  await db
    .insert(webhookEvents)
    .values({
      corsairEventId: eventKey,
      eventType: event.type,
      payload: event,
      status: "pending",
    })
    .onConflictDoNothing();

  const [recorded] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.corsairEventId, eventKey))
    .limit(1);

  if (!recorded) return;
  if (recorded.status === "processed") return;

  try {
    const message = event.message;
    const headerSubject = readHeader(message.payload?.headers, "Subject");
    const headerFrom = readHeader(message.payload?.headers, "From");
    const headerTo = readHeader(message.payload?.headers, "To");
    const currentLabels = message.labelIds ?? [];

    if (event.type === "messageDeleted") {
      if (message.id) {
        await db.delete(emails).where(eq(emails.corsairEmailId, message.id));
      }
    } else if (message.id) {
      await db
        .insert(emails)
        .values({
          corsairEmailId: message.id,
          threadId: message.threadId ?? null,
          subject: message.subject ?? headerSubject ?? "Untitled message",
          fromAddress: message.from ?? headerFrom ?? event.emailAddress,
          toAddresses: toAddresses(message, headerTo),
          snippet: message.snippet ?? null,
          bodyHtml: messageBody(message) ?? null,
          isRead: !currentLabels.includes("UNREAD"),
          labels: currentLabels,
          receivedAt: normalizeDate(message.internalDate) ?? new Date(),
        })
        .onConflictDoUpdate({
          target: emails.corsairEmailId,
          set: {
            threadId: message.threadId ?? null,
            subject: message.subject ?? headerSubject ?? "Untitled message",
            fromAddress: message.from ?? headerFrom ?? event.emailAddress,
            toAddresses: toAddresses(message, headerTo),
            snippet: message.snippet ?? null,
            bodyHtml: messageBody(message) ?? null,
            isRead: !currentLabels.includes("UNREAD"),
            labels: currentLabels,
            receivedAt: normalizeDate(message.internalDate) ?? new Date(),
          },
        });
    }

    await db
      .update(webhookEvents)
      .set({
        status: "processed",
        processedAt: new Date(),
        payload: event,
      })
      .where(eq(webhookEvents.id, recorded.id));
  } catch (error) {
    await db
      .update(webhookEvents)
      .set({
        status: "failed",
        payload: {
          ...event,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      })
      .where(eq(webhookEvents.id, recorded.id));

    throw error;
  }
}

export async function listProjectedInboxThreads(limit = 24) {
  const rows = await db
    .select()
    .from(emails)
    .orderBy(desc(emails.receivedAt), desc(emails.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.threadId ?? row.corsairEmailId,
    from: row.fromAddress ?? "Unknown sender",
    subject: row.subject ?? "Untitled message",
    preview: row.snippet ?? "No preview available",
    receivedAt: row.receivedAt?.toISOString() ?? null,
    labels: row.labels ?? [],
    messageCount: 1,
  }));
}
