import "server-only";

import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { z } from "zod";

import { env } from "~/env";
import { db } from "~/server/db";
import { commitments, emails } from "~/server/db/schema";

const extractedCommitmentSchema = z.object({
  sourceEmailId: z.string().min(1),
  type: z.enum(["OUTBOUND", "INBOUND"]),
  actionSummary: z.string().min(3),
  rawQuote: z.string().nullable().optional(),
  counterpartyEmail: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});

const extractionResponseSchema = z.object({
  commitments: z.array(extractedCommitmentSchema).max(24),
});

const threadCommitmentSchema = extractedCommitmentSchema.omit({
  sourceEmailId: true,
});

const threadExtractionResponseSchema = z.object({
  commitments: z.array(threadCommitmentSchema).max(8),
});

export type KodaCommitment = {
  id: string;
  emailId: string | null;
  threadId: string | null;
  type: "OUTBOUND" | "INBOUND";
  actionSummary: string;
  rawQuote: string | null;
  counterpartyEmail: string | null;
  deadline: string | null;
  status: "active" | "resolved" | "expired";
  confidence: string | null;
  createdAt: string;
  sourceSubject: string | null;
  sourceFrom: string | null;
};

type SourceEmail = typeof emails.$inferSelect;

type ThreadMessage = {
  from: string;
  to?: string | null;
  body: string;
  time?: string | null;
};

function stripHtml(value: string | null) {
  if (!value) return "";
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>(?=)/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseJsonObject(text: string) {
  const withoutFence = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The extractor did not return JSON.");
  }
  return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
}

function normalizeDeadline(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function confidenceString(value: number) {
  return Math.min(Math.max(value, 0), 1).toFixed(2);
}

function mapCommitmentRow(row: {
  commitment: typeof commitments.$inferSelect;
  email: typeof emails.$inferSelect | null;
}): KodaCommitment {
  return {
    id: row.commitment.id,
    emailId: row.commitment.emailId,
    threadId: row.commitment.threadId,
    type: row.commitment.type,
    actionSummary: row.commitment.actionSummary,
    rawQuote: row.commitment.rawQuote,
    counterpartyEmail: row.commitment.counterpartyEmail,
    deadline: row.commitment.deadline?.toISOString() ?? null,
    status: row.commitment.status,
    confidence: row.commitment.confidence,
    createdAt: row.commitment.createdAt.toISOString(),
    sourceSubject: row.email?.subject ?? null,
    sourceFrom: row.email?.fromAddress ?? null,
  };
}

export async function listCommitments(limit = 80): Promise<KodaCommitment[]> {
  const rows = await db
    .select({
      commitment: commitments,
      email: emails,
    })
    .from(commitments)
    .leftJoin(emails, eq(commitments.emailId, emails.id))
    .orderBy(desc(commitments.createdAt))
    .limit(limit);

  return rows.map(mapCommitmentRow);
}

/** Mark a commitment done — keeps the row but drops it from the active lanes. */
export async function resolveCommitment(id: string): Promise<void> {
  await db
    .update(commitments)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(commitments.id, id));
}

/** Permanently remove a single commitment. */
export async function deleteCommitment(id: string): Promise<void> {
  await db.delete(commitments).where(eq(commitments.id, id));
}

/**
 * Remove resolved/expired commitments older than `retentionDays`, and mark
 * still-active ones past that age as expired. Runs on each commitments load.
 */
export async function purgeExpiredCommitments(retentionDays = 7): Promise<void> {
  const days = Number.isFinite(retentionDays) ? Math.max(1, retentionDays) : 7;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    // Done/expired items past the window are deleted outright.
    await db
      .delete(commitments)
      .where(
        and(
          inArray(commitments.status, ["resolved", "expired"]),
          lt(commitments.createdAt, cutoff),
        ),
      );
    // Active items past the window expire (still visible, flagged expired).
    await db
      .update(commitments)
      .set({ status: "expired" })
      .where(
        and(
          eq(commitments.status, "active"),
          lt(commitments.createdAt, cutoff),
        ),
      );
  } catch {
    // Tolerate a not-yet-migrated DB.
  }
}

export async function searchCommitments(query: string | undefined, limit = 20) {
  const normalized = query?.trim().toLowerCase();
  const rows = await listCommitments(80);
  const filtered = normalized
    ? rows.filter((item) =>
        [
          item.actionSummary,
          item.rawQuote,
          item.counterpartyEmail,
          item.sourceSubject,
          item.sourceFrom,
          item.type,
          item.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
    : rows;

  return filtered.slice(0, limit);
}

export async function listActiveCommitmentsByThreadIds(threadIds: string[]) {
  const ids = [...new Set(threadIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, KodaCommitment>();

  const rows = await db
    .select({
      commitment: commitments,
      email: emails,
    })
    .from(commitments)
    .leftJoin(emails, eq(commitments.emailId, emails.id))
    .where(inArray(commitments.threadId, ids))
    .orderBy(desc(commitments.confidence), desc(commitments.createdAt));

  const byThread = new Map<string, KodaCommitment>();
  for (const row of rows) {
    const mapped = mapCommitmentRow(row);
    if (
      mapped.threadId &&
      mapped.status === "active" &&
      !byThread.has(mapped.threadId)
    ) {
      byThread.set(mapped.threadId, mapped);
    }
  }
  return byThread;
}

function buildExtractionPrompt({
  sourceEmails,
  userEmail,
  timeZone,
}: {
  sourceEmails: SourceEmail[];
  userEmail: string;
  timeZone: string;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const payload = sourceEmails.map((email) => ({
    sourceEmailId: email.id,
    threadId: email.threadId,
    subject: email.subject,
    from: email.fromAddress,
    to: email.toAddresses,
    receivedAt: email.receivedAt?.toISOString() ?? null,
    snippet: email.snippet,
    body: stripHtml(email.bodyHtml).slice(0, 1800),
  }));

  return `Today is ${today}. User email: ${userEmail}. User timezone: ${timeZone}.

Extract concrete operational commitments from these cached Gmail messages.

Rules:
- A commitment is a promise, request, follow-up, deadline, deliverable, decision owed, or action someone needs to complete.
- Meeting coordination is a commitment even without a fixed time when someone asks for availability, offers to schedule a call, or asks the other person to choose an option.
- Ignore newsletters, job alerts, marketing, receipts, generic FYI, and vague statements without an action or next step.
- type OUTBOUND means the user owes the work. type INBOUND means someone else owes the user work.
- Infer counterpartyEmail from sender/recipient when possible.
- deadline must be ISO 8601 with timezone if a deadline is explicit or strongly implied. Otherwise null.
- confidence should be 0 to 1. Use at least 0.70 only for clear commitments.
- rawQuote should be the shortest useful quote from the email.
- Return strict JSON only with this shape:
{"commitments":[{"sourceEmailId":"...","type":"OUTBOUND","actionSummary":"...","rawQuote":"...","counterpartyEmail":"...","deadline":"2026-06-15T17:00:00+05:30","confidence":0.82}]}

Cached emails:
${JSON.stringify(payload)}`;
}

function buildThreadExtractionPrompt({
  threadId,
  subject,
  messages,
  userEmail,
  timeZone,
}: {
  threadId: string;
  subject: string;
  messages: ThreadMessage[];
  userEmail: string;
  timeZone: string;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return `Today is ${today}. User email: ${userEmail}. User timezone: ${timeZone}.

Extract concrete operational commitments from this active Gmail thread.

Rules:
- A commitment is a promise, request, follow-up, deadline, deliverable, decision owed, meeting coordination, or action someone needs to complete.
- type OUTBOUND means the user owes the work. type INBOUND means someone else owes the user work.
- If someone asks the user for urgent help/explanation, extract an OUTBOUND commitment unless the later replies clearly fully resolve it.
- If the user asks the other person to confirm availability, choose an option, or say whether they prefer a meeting/call/email, extract an INBOUND commitment for the other person to respond.
- A proposed meeting without a fixed time is still a coordination commitment. Use deadline null unless an explicit deadline exists.
- counterpartyEmail should be the non-user participant when possible.
- confidence should be 0 to 1. Use at least 0.70 for clear asks or clear next steps.
- rawQuote should be the shortest useful quote from the thread.
- Return strict JSON only with this shape:
{"commitments":[{"type":"INBOUND","actionSummary":"Krunetic to confirm whether they prefer a meeting or email overview for Blind 75 DSA Sheet","rawQuote":"Please let me know which option works best for you.","counterpartyEmail":"krunetic@gmail.com","deadline":null,"confidence":0.84}]}

Thread:
${JSON.stringify({
  threadId,
  subject,
  messages: messages.map((message) => ({
    from: message.from,
    to: message.to,
    time: message.time,
    body: message.body.slice(0, 2200),
  })),
})}`;
}

export async function extractCommitmentsFromRecentEmails({
  userEmail,
  timeZone = "UTC",
  limit = 16,
}: {
  userEmail: string;
  timeZone?: string;
  limit?: number;
}) {
  if (!env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required for commitment extraction.");
  }

  const sourceEmails = await db
    .select()
    .from(emails)
    .orderBy(desc(emails.receivedAt), desc(emails.createdAt))
    .limit(limit);

  if (sourceEmails.length === 0) {
    return { scanned: 0, extracted: 0 };
  }

  const result = await generateText({
    model: groq(env.KODA_AI_MODEL ?? "llama-3.3-70b-versatile"),
    system:
      "You extract reliable work commitments from email. You return strict JSON and no markdown.",
    prompt: buildExtractionPrompt({ sourceEmails, userEmail, timeZone }),
  });

  const parsed = extractionResponseSchema.parse(parseJsonObject(result.text));
  const sourceById = new Map(sourceEmails.map((email) => [email.id, email]));
  const sourceIds = sourceEmails.map((email) => email.id);
  const extracted = parsed.commitments.filter((item) =>
    sourceById.has(item.sourceEmailId),
  );
  const committedEmailIds = [
    ...new Set(extracted.map((item) => item.sourceEmailId)),
  ];

  await db.transaction(async (tx) => {
    await tx.delete(commitments).where(inArray(commitments.emailId, sourceIds));
    await tx
      .update(emails)
      .set({ hasCommitments: false })
      .where(inArray(emails.id, sourceIds));

    if (extracted.length > 0) {
      await tx.insert(commitments).values(
        extracted.map((item) => {
          const source = sourceById.get(item.sourceEmailId);
          return {
            emailId: item.sourceEmailId,
            threadId: source?.threadId ?? null,
            type: item.type,
            actionSummary: item.actionSummary,
            rawQuote: item.rawQuote ?? null,
            counterpartyEmail: item.counterpartyEmail ?? null,
            deadline: normalizeDeadline(item.deadline),
            confidence: confidenceString(item.confidence),
          };
        }),
      );
      await tx
        .update(emails)
        .set({ hasCommitments: true })
        .where(inArray(emails.id, committedEmailIds));
    }
  });

  return {
    scanned: sourceEmails.length,
    extracted: extracted.length,
  };
}

export async function extractCommitmentsFromThread({
  threadId,
  subject,
  messages,
  userEmail,
  timeZone = "UTC",
}: {
  threadId: string;
  subject: string;
  messages: ThreadMessage[];
  userEmail: string;
  timeZone?: string;
}) {
  const id = threadId.trim();
  if (!id) throw new Error("Thread id is required.");
  if (messages.length === 0) throw new Error("Thread messages are required.");
  if (!env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required for commitment extraction.");
  }

  const result = await generateText({
    model: groq(env.KODA_AI_MODEL ?? "llama-3.3-70b-versatile"),
    system:
      "You extract reliable work commitments from email threads. You return strict JSON and no markdown.",
    prompt: buildThreadExtractionPrompt({
      threadId: id,
      subject,
      messages,
      userEmail,
      timeZone,
    }),
  });

  const parsed = threadExtractionResponseSchema.parse(
    parseJsonObject(result.text),
  );

  await db.transaction(async (tx) => {
    await tx.delete(commitments).where(eq(commitments.threadId, id));

    if (parsed.commitments.length > 0) {
      await tx.insert(commitments).values(
        parsed.commitments.map((item) => ({
          emailId: null,
          threadId: id,
          type: item.type,
          actionSummary: item.actionSummary,
          rawQuote: item.rawQuote ?? null,
          counterpartyEmail: item.counterpartyEmail ?? null,
          deadline: normalizeDeadline(item.deadline),
          confidence: confidenceString(item.confidence),
        })),
      );
    }
  });

  return {
    scanned: messages.length,
    extracted: parsed.commitments.length,
  };
}
