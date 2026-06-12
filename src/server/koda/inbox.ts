import "server-only";

import { corsair } from "~/server/corsair";

import { getTenantId } from "./tenant";

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

type GmailMessage = {
  id?: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string | null;
  subject?: string;
  from?: string;
  to?: string;
  body?: string;
  payload?: {
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailPart[];
    headers?: Array<{
      name?: string;
      value?: string;
    }>;
  };
};

type GmailThread = {
  id?: string;
  snippet?: string;
  historyId?: string;
  messages?: GmailMessage[];
};

export type InboxThread = {
  id: string;
  from: string;
  to: string | null;
  subject: string;
  preview: string;
  body: string | null;
  receivedAt: string | null;
  labels: string[];
  messageCount: number;
  messages: InboxMessage[];
};

export type InboxMessage = {
  id: string;
  from: string;
  to: string | null;
  subject: string;
  body: string;
  preview: string;
  receivedAt: string | null;
};

export type InboxThreadPage = {
  threads: InboxThread[];
  nextPageToken: string | null;
};

function readHeader(
  message: GmailMessage | undefined,
  headerName: string,
): string | undefined {
  return message?.payload?.headers?.find(
    (header) => header.name?.toLowerCase() === headerName.toLowerCase(),
  )?.value;
}

function decode(data: string | undefined): string | undefined {
  if (!data) return undefined;
  try {
    return Buffer.from(data, "base64").toString("utf-8");
  } catch {
    return undefined;
  }
}

function collectByMime(
  part: GmailPart | undefined,
  mime: string,
  out: string[] = [],
): string[] {
  if (!part) return out;
  if (part.mimeType === mime) {
    const decoded = decode(part.body?.data);
    if (decoded) out.push(decoded);
  }
  for (const child of part.parts ?? []) collectByMime(child, mime, out);
  return out;
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|tr|li|h[1-6]|br)>/gi, "\n")
    .replace(/<br\s*\/?>(?=)/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Picks the richest readable body: longest of text/plain vs stripped text/html. */
function bestBody(message: GmailMessage): string | undefined {
  if (message.body) return message.body;

  const plain = collectByMime(message.payload, "text/plain").join("\n").trim();
  const html = collectByMime(message.payload, "text/html").join("\n");
  const stripped = html ? stripHtml(html) : "";

  const candidates = [plain, stripped].filter(Boolean);
  if (candidates.length === 0) {
    const raw = decode(message.payload?.body?.data);
    return raw ? (raw.includes("<") ? stripHtml(raw) : raw) : undefined;
  }
  return candidates.sort((a, b) => b.length - a.length)[0];
}

function normalizeThread(thread: GmailThread): InboxThread | null {
  if (!thread.id) return null;

  const lastMessage = thread.messages?.at(-1);
  const messages = (thread.messages ?? []).flatMap(normalizeMessage);
  const subject =
    lastMessage?.subject ??
    readHeader(lastMessage, "subject") ??
    "Untitled thread";
  const from =
    lastMessage?.from ?? readHeader(lastMessage, "from") ?? "Unknown sender";
  const to = lastMessage?.to ?? readHeader(lastMessage, "to") ?? null;
  const preview =
    lastMessage?.snippet ?? thread.snippet ?? "No preview available";
  const receivedAt = lastMessage?.internalDate ?? null;

  const body = lastMessage ? bestBody(lastMessage) : undefined;

  return {
    id: thread.id,
    from,
    to,
    subject,
    preview,
    body: body || preview,
    receivedAt,
    labels: lastMessage?.labelIds ?? [],
    messageCount: messages.length,
    messages,
  };
}

function normalizeMessage(message: GmailMessage): InboxMessage[] {
  if (!message.id) return [];

  const subject =
    message.subject ?? readHeader(message, "subject") ?? "Untitled message";
  const from = message.from ?? readHeader(message, "from") ?? "Unknown sender";
  const to = message.to ?? readHeader(message, "to") ?? null;
  const preview = message.snippet ?? "No preview available";
  const body = bestBody(message) || preview;

  return [
    {
      id: message.id,
      from,
      to,
      subject,
      body,
      preview,
      receivedAt: message.internalDate ?? null,
    },
  ];
}

export async function getInboxThreads(options?: {
  maxResults?: number;
  tenantId?: string;
}): Promise<InboxThread[]> {
  const page = await getInboxThreadPage(options);
  return page.threads;
}

export async function getInboxThreadPage(options?: {
  maxResults?: number;
  pageToken?: string;
  tenantId?: string;
}): Promise<InboxThreadPage> {
  const tenantId = options?.tenantId ?? (await getTenantId());
  const gmail = corsair.withTenant(tenantId).gmail;

  try {
    const list = await gmail.api.threads.list({
      maxResults: options?.maxResults ?? 12,
      pageToken: options?.pageToken,
      includeSpamTrash: false,
    });

    const threadIds = (list.threads ?? [])
      .map((thread) => thread.id)
      .filter((id): id is string => Boolean(id));

    const detailedThreads = await Promise.all(
      threadIds.map(async (id) => {
        try {
          return await gmail.api.threads.get({
            id,
            format: "full",
          });
        } catch {
          return null;
        }
      }),
    );

    const threads = detailedThreads.flatMap((thread) => {
      if (!thread) return [];

      const normalized = normalizeThread(thread);
      return normalized ? [normalized] : [];
    });

    return {
      threads,
      nextPageToken: list.nextPageToken ?? null,
    };
  } catch {
    return { threads: [], nextPageToken: null };
  }
}
