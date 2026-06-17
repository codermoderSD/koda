import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { emailAliases } from "~/server/db/schema";

export type EmailAlias = {
  id: string;
  alias: string;
  email: string;
  label: string | null;
  createdAt: string;
};

export async function listAliases(userId: string): Promise<EmailAlias[]> {
  const rows = await db
    .select()
    .from(emailAliases)
    .where(eq(emailAliases.userId, userId))
    .orderBy(asc(emailAliases.alias));
  return rows.map((r) => ({
    id: r.id,
    alias: r.alias,
    email: r.email,
    label: r.label,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createAlias(input: {
  userId: string;
  alias: string;
  email: string;
  label?: string;
}): Promise<EmailAlias> {
  const normalized = input.alias.toLowerCase().replace(/^@/, "");
  const [row] = await db
    .insert(emailAliases)
    .values({
      userId: input.userId,
      alias: normalized,
      email: input.email.trim().toLowerCase(),
      label: input.label?.trim() ?? null,
    })
    .onConflictDoUpdate({
      target: [emailAliases.userId, emailAliases.alias],
      set: {
        email: input.email.trim().toLowerCase(),
        label: input.label?.trim() ?? null,
      },
    })
    .returning();
  if (!row) throw new Error("Could not create alias.");
  return {
    id: row.id,
    alias: row.alias,
    email: row.email,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function deleteAlias(input: {
  userId: string;
  aliasId: string;
}): Promise<void> {
  await db
    .delete(emailAliases)
    .where(
      and(
        eq(emailAliases.id, input.aliasId),
        eq(emailAliases.userId, input.userId),
      ),
    );
}
