import "server-only";

import { corsair } from "~/server/corsair";

import { DEFAULT_KODA_TENANT_ID } from "./tenant";
import { listProjectedInboxThreads } from "./gmail-projection";

type GmailMessage = {
  id?: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string | null;
  subject?: string;
  from?: string;
  to?: string;
  payload?: {
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
  subject: string;
  preview: string;
  receivedAt: string | null;
  labels: string[];
  messageCount: number;
};

function readHeader(
  message: GmailMessage | undefined,
  headerName: string,
): string | undefined {
  return message?.payload?.headers?.find(
    (header) => header.name?.toLowerCase() === headerName.toLowerCase(),
  )?.value;
}

function normalizeThread(thread: GmailThread): InboxThread | null {
  if (!thread.id) return null;

  const lastMessage = thread.messages?.at(-1);
  const subject = lastMessage?.subject ?? readHeader(lastMessage, "subject") ?? "Untitled thread";
  const from = lastMessage?.from ?? readHeader(lastMessage, "from") ?? "Unknown sender";
  const preview = lastMessage?.snippet ?? thread.snippet ?? "No preview available";
  const receivedAt = lastMessage?.internalDate ?? null;

  return {
    id: thread.id,
    from,
    subject,
    preview,
    receivedAt,
    labels: lastMessage?.labelIds ?? [],
    messageCount: thread.messages?.length ?? 0,
  };
}

export async function getInboxThreads(options?: {
  maxResults?: number;
  tenantId?: string;
}): Promise<InboxThread[]> {
  const projectedThreads = await listProjectedInboxThreads(
    options?.maxResults ?? 24,
  );
  if (projectedThreads.length > 0) return projectedThreads;

  const tenantId = options?.tenantId ?? DEFAULT_KODA_TENANT_ID;
  const gmail = corsair.withTenant(tenantId).gmail;

  try {
    const list = await gmail.api.threads.list({
      maxResults: options?.maxResults ?? 12,
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

    return detailedThreads.flatMap((thread) => {
      if (!thread) return [];

      const normalized = normalizeThread(thread);
      return normalized ? [normalized] : [];
    });
  } catch {
    return [];
  }
}
