import "server-only";

import { corsair } from "~/server/corsair";
import { getSession } from "~/server/better-auth/server";

import { getTenantId } from "./tenant";

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessage = {
  id?: string;
  threadId?: string;
  subject?: string;
  from?: string;
  to?: string;
  cc?: string;
  payload?: {
    headers?: GmailHeader[];
  };
};

type GmailThread = {
  id?: string;
  messages?: GmailMessage[];
};

type GmailDraftsApi = {
  drafts?: {
    create(input: { message: { raw: string } }): Promise<{
      id?: string | null;
      message?: {
        id?: string | null;
        threadId?: string | null;
      };
    }>;
  };
};

export type GmailReplyResult = {
  id: string | null;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  sentAt: string;
};

export type GmailSendResult = {
  id: string | null;
  threadId: string | null;
  from: string;
  to: string[];
  subject: string;
  body: string;
  sentAt: string;
};

export type GmailAttachment = {
  filename: string;
  mimeType: string;
  data: string;
};

export type GmailDraftResult = {
  id: string | null;
  messageId: string | null;
  threadId: string | null;
  from: string;
  to: string[];
  subject: string;
  body: string;
  savedAt: string;
};

function readHeader(message: GmailMessage | undefined, name: string) {
  const normalizedName = name.toLowerCase();
  if (normalizedName === "subject" && message?.subject) return message.subject;
  if (normalizedName === "from" && message?.from) return message.from;
  if (normalizedName === "to" && message?.to) return message.to;
  if (normalizedName === "cc" && message?.cc) return message.cc;

  return message?.payload?.headers?.find(
    (header) => header.name?.toLowerCase() === name.toLowerCase(),
  )?.value;
}

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function cleanFilename(value: string) {
  return cleanHeader(value).replace(/"/g, "'");
}

function extractEmail(value: string) {
  const match = /<([^>]+)>/.exec(value);
  return cleanHeader(match?.[1] ?? value).toLowerCase();
}

function splitAddresses(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => cleanHeader(part))
    .filter(Boolean);
}

function chooseReplyRecipients(
  message: GmailMessage | undefined,
  selfEmail: string,
) {
  const self = selfEmail.toLowerCase();
  const from = splitAddresses(readHeader(message, "From"));
  const to = splitAddresses(readHeader(message, "To"));
  const cc = splitAddresses(readHeader(message, "Cc"));

  const fromOthers = from.filter((address) => extractEmail(address) !== self);
  if (fromOthers.length > 0) return fromOthers;

  return [...to, ...cc].filter((address) => extractEmail(address) !== self);
}

function findReplySource(messages: GmailMessage[], selfEmail: string) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (chooseReplyRecipients(message, selfEmail).length > 0) return message;
  }
  return messages.at(-1);
}

function replySubject(subject: string | undefined) {
  const safe = cleanHeader(subject?.trim() || "Untitled thread");
  return /^re:/i.test(safe) ? safe : `Re: ${safe}`;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makePlainReply({
  from,
  to,
  subject,
  body,
  inReplyTo,
  references,
}: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}) {
  const headers = [
    `From: ${cleanHeader(from)}`,
    `To: ${cleanHeader(to)}`,
    `Subject: ${cleanHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];

  if (inReplyTo) headers.push(`In-Reply-To: ${cleanHeader(inReplyTo)}`);
  if (references || inReplyTo) {
    headers.push(
      `References: ${cleanHeader([references, inReplyTo].filter(Boolean).join(" "))}`,
    );
  }

  return `${headers.join("\r\n")}\r\n\r\n${body.trim()}\r\n`;
}

function encodeAttachmentData(value: string) {
  const base64 = value.includes(",") ? value.split(",").at(-1)! : value;
  return base64.replace(/(.{76})/g, "$1\r\n");
}

function makeMessage({
  from,
  to,
  subject,
  body,
  attachments = [],
}: {
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments?: GmailAttachment[];
}) {
  if (attachments.length > 0) {
    const boundary = `koda_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const headers = [
      `From: ${cleanHeader(from)}`,
      `To: ${cleanHeader(to)}`,
      `Subject: ${cleanHeader(subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ];
    const parts = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body.trim(),
      ...attachments.flatMap((attachment) => [
        `--${boundary}`,
        `Content-Type: ${cleanHeader(attachment.mimeType)}; name="${cleanFilename(attachment.filename)}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${cleanFilename(attachment.filename)}"`,
        "",
        encodeAttachmentData(attachment.data),
      ]),
      `--${boundary}--`,
      "",
    ];

    return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
  }

  const headers = [
    `From: ${cleanHeader(from)}`,
    `To: ${cleanHeader(to)}`,
    `Subject: ${cleanHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${body.trim()}\r\n`;
}

export async function sendThreadReply(input: {
  threadId: string;
  body: string;
  tenantId?: string;
}): Promise<GmailReplyResult> {
  const threadId = input.threadId.trim();
  const body = input.body.trim();
  if (!threadId) throw new Error("Thread id is required.");
  if (!body) throw new Error("Reply body is required.");

  const session = await getSession();
  const from = session?.user.email;
  if (!from) throw new Error("You must be signed in to send a reply.");

  const tenantId = input.tenantId ?? (await getTenantId());
  const gmail = corsair.withTenant(tenantId).gmail;
  const thread = (await gmail.api.threads.get({
    id: threadId,
    format: "full",
  })) as GmailThread;

  const messages = thread.messages ?? [];
  const replySource = findReplySource(messages, from);
  const recipients = chooseReplyRecipients(replySource, from);
  if (recipients.length === 0) {
    throw new Error("Could not determine the reply recipient.");
  }

  const subject = replySubject(readHeader(replySource, "Subject"));
  const messageId = readHeader(replySource, "Message-ID");
  const references = readHeader(replySource, "References");
  const raw = encodeBase64Url(
    makePlainReply({
      from,
      to: recipients.join(", "),
      subject,
      body,
      inReplyTo: messageId,
      references,
    }),
  );

  const sent = await gmail.api.messages.send({ raw, threadId });
  return {
    id: sent.id ?? null,
    threadId: sent.threadId ?? threadId,
    from,
    to: recipients,
    subject,
    body,
    sentAt: new Date().toISOString(),
  };
}

export async function sendEmail(input: {
  to: string[];
  subject: string;
  body: string;
  attachments?: GmailAttachment[];
  tenantId?: string;
}): Promise<GmailSendResult> {
  const recipients = input.to
    .map((value) => cleanHeader(value))
    .filter(Boolean);
  const subject = cleanHeader(input.subject.trim());
  const body = input.body.trim();

  if (recipients.length === 0)
    throw new Error("At least one recipient is required.");
  if (!subject) throw new Error("Subject is required.");
  if (!body) throw new Error("Message body is required.");

  const session = await getSession();
  const from = session?.user.email;
  if (!from) throw new Error("You must be signed in to send email.");

  const tenantId = input.tenantId ?? (await getTenantId());
  const gmail = corsair.withTenant(tenantId).gmail;
  const raw = encodeBase64Url(
    makeMessage({
      from,
      to: recipients.join(", "),
      subject,
      body,
      attachments: input.attachments,
    }),
  );

  const sent = await gmail.api.messages.send({ raw });
  return {
    id: sent.id ?? null,
    threadId: sent.threadId ?? null,
    from,
    to: recipients,
    subject,
    body,
    sentAt: new Date().toISOString(),
  };
}

export async function saveEmailDraft(input: {
  to: string[];
  subject: string;
  body: string;
  attachments?: GmailAttachment[];
  tenantId?: string;
}): Promise<GmailDraftResult> {
  const recipients = input.to
    .map((value) => cleanHeader(value))
    .filter(Boolean);
  const subject = cleanHeader(input.subject.trim());
  const body = input.body.trim();

  if (recipients.length === 0)
    throw new Error("At least one recipient is required.");
  if (!subject) throw new Error("Subject is required.");
  if (!body) throw new Error("Message body is required.");

  const session = await getSession();
  const from = session?.user.email;
  if (!from) throw new Error("You must be signed in to save a draft.");

  const tenantId = input.tenantId ?? (await getTenantId());
  const gmail = corsair.withTenant(tenantId).gmail;
  const raw = encodeBase64Url(
    makeMessage({
      from,
      to: recipients.join(", "),
      subject,
      body,
      attachments: input.attachments,
    }),
  );

  const draftsApi = (gmail.api as typeof gmail.api & GmailDraftsApi).drafts;
  if (!draftsApi) {
    throw new Error("Gmail draft creation is not available.");
  }

  const draft = await draftsApi.create({
    message: { raw },
  });

  return {
    id: draft.id ?? null,
    messageId: draft.message?.id ?? null,
    threadId: draft.message?.threadId ?? null,
    from,
    to: recipients,
    subject,
    body,
    savedAt: new Date().toISOString(),
  };
}
