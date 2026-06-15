import "server-only";

import { corsair } from "~/server/corsair";

import { getTenantId } from "./tenant";

type GmailPart = {
  partId?: string;
  filename?: string;
  mimeType?: string;
  body?: { data?: string; attachmentId?: string };
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

type GmailApiWithAttachments = {
  messages?: {
    attachments?: {
      get(input: {
        messageId: string;
        id: string;
      }): Promise<{ data?: string | null }>;
    };
  };
};

export type InboxImageAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  dataUrl: string;
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
  attachments: InboxImageAttachment[];
};

export type InboxThreadPage = {
  threads: InboxThread[];
  nextPageToken: string | null;
};

function textOrFallback(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return value;
}

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
    return Buffer.from(base64UrlToBase64(data), "base64").toString("utf-8");
  } catch {
    return undefined;
  }
}

function base64UrlToBase64(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
}

function imageDataUrl(mimeType: string, data: string) {
  return `data:${mimeType};base64,${base64UrlToBase64(data)}`;
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

function collectImageParts(
  part: GmailPart | undefined,
  out: GmailPart[] = [],
): GmailPart[] {
  if (!part) return out;
  if (
    part.mimeType?.startsWith("image/") &&
    (part.body?.data || part.body?.attachmentId)
  ) {
    out.push(part);
  }
  for (const child of part.parts ?? []) collectImageParts(child, out);
  return out;
}

async function imageAttachmentsFor(
  api: unknown,
  message: GmailMessage,
): Promise<InboxImageAttachment[]> {
  if (!message.id) return [];
  const attachmentApi = (api as GmailApiWithAttachments).messages?.attachments;
  const parts = collectImageParts(message.payload).slice(0, 6);

  const attachments = await Promise.all(
    parts.map(async (part, index) => {
      const mimeType = part.mimeType ?? "image/png";
      let data = part.body?.data;
      const attachmentId = part.body?.attachmentId;

      if (!data && attachmentId && attachmentApi) {
        const response = await attachmentApi
          .get({ messageId: message.id!, id: attachmentId })
          .catch(() => null);
        data = response?.data ?? undefined;
      }

      if (!data) return null;

      return {
        id: `${message.id}-${part.partId ?? index}`,
        filename: textOrFallback(part.filename?.trim(), `image-${index + 1}`),
        mimeType,
        dataUrl: imageDataUrl(mimeType, data),
      };
    }),
  );

  return attachments.filter((attachment): attachment is InboxImageAttachment =>
    Boolean(attachment),
  );
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

async function normalizeThread(
  thread: GmailThread,
  api: unknown,
): Promise<InboxThread | null> {
  if (!thread.id) return null;

  const lastMessage = thread.messages?.at(-1);
  const messages = (
    await Promise.all(
      (thread.messages ?? []).map((message) => normalizeMessage(message, api)),
    )
  ).flat();
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
    body: textOrFallback(body, preview),
    receivedAt,
    labels: lastMessage?.labelIds ?? [],
    messageCount: messages.length,
    messages,
  };
}

async function normalizeMessage(
  message: GmailMessage,
  api: unknown,
): Promise<InboxMessage[]> {
  if (!message.id) return [];

  const subject =
    message.subject ?? readHeader(message, "subject") ?? "Untitled message";
  const from = message.from ?? readHeader(message, "from") ?? "Unknown sender";
  const to = message.to ?? readHeader(message, "to") ?? null;
  const preview = message.snippet ?? "No preview available";
  const body = textOrFallback(bestBody(message), preview);
  const attachments = await imageAttachmentsFor(api, message);

  return [
    {
      id: message.id,
      from,
      to,
      subject,
      body,
      preview,
      receivedAt: message.internalDate ?? null,
      attachments,
    },
  ];
}

export async function getInboxThreads(options?: {
  maxResults?: number;
  q?: string;
  tenantId?: string;
}): Promise<InboxThread[]> {
  const page = await getInboxThreadPage(options);
  return page.threads;
}

export async function getInboxThread(
  threadId: string,
  tenantId?: string,
): Promise<InboxThread | null> {
  const id = threadId.trim();
  if (!id) return null;

  const resolvedTenantId = tenantId ?? (await getTenantId());
  const gmail = corsair.withTenant(resolvedTenantId).gmail;

  try {
    const thread = await gmail.api.threads.get({
      id,
      format: "full",
    });
    return normalizeThread(thread, gmail.api);
  } catch {
    return null;
  }
}

export async function getInboxThreadPage(options?: {
  maxResults?: number;
  pageToken?: string;
  q?: string;
  tenantId?: string;
}): Promise<InboxThreadPage> {
  const tenantId = options?.tenantId ?? (await getTenantId());
  const gmail = corsair.withTenant(tenantId).gmail;

  try {
    const list = await gmail.api.threads.list({
      maxResults: options?.maxResults ?? 12,
      pageToken: options?.pageToken,
      q: options?.q,
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

    const normalizedThreads = await Promise.all(
      detailedThreads.map(async (thread) =>
        thread ? await normalizeThread(thread, gmail.api) : null,
      ),
    );
    const threads = normalizedThreads.filter((thread): thread is InboxThread =>
      Boolean(thread),
    );

    return {
      threads,
      nextPageToken: list.nextPageToken ?? null,
    };
  } catch {
    return { threads: [], nextPageToken: null };
  }
}
