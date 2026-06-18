import "server-only";

import { and, eq } from "drizzle-orm";

import { env } from "~/env";
import { corsair } from "~/server/corsair";
import { db } from "~/server/db";
import {
  accounts,
  corsairAccounts,
  corsairIntegrations,
} from "~/server/db/schema";

export type ConnectionState = "connected" | "needs-reconnect";

type PluginName = "gmail" | "googlecalendar";

async function getGoogleAccount(userId: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "google")))
    .limit(1);
  return row ?? null;
}

async function dekExists(getDek: () => Promise<string>) {
  try {
    await getDek();
    return true;
  } catch {
    return false;
  }
}

async function ensureIntegrationRow(name: PluginName) {
  const [existing] = await db
    .select()
    .from(corsairIntegrations)
    .where(eq(corsairIntegrations.name, name))
    .limit(1);
  if (existing) return existing;

  await db
    .insert(corsairIntegrations)
    .values({ id: name, name })
    .onConflictDoNothing({ target: corsairIntegrations.id });

  const [created] = await db
    .select()
    .from(corsairIntegrations)
    .where(eq(corsairIntegrations.name, name))
    .limit(1);
  if (!created) throw new Error(`Failed to create Corsair integration ${name}`);
  return created;
}

async function ensureAccountRow(name: PluginName, tenantId: string) {
  const integration = await ensureIntegrationRow(name);
  const [existing] = await db
    .select()
    .from(corsairAccounts)
    .where(
      and(
        eq(corsairAccounts.tenantId, tenantId),
        eq(corsairAccounts.integrationId, integration.id),
      ),
    )
    .limit(1);
  if (existing) return existing;

  await db
    .insert(corsairAccounts)
    .values({
      id: `${tenantId}:${integration.id}`,
      tenantId,
      integrationId: integration.id,
    })
    .onConflictDoNothing({ target: corsairAccounts.id });

  const [created] = await db
    .select()
    .from(corsairAccounts)
    .where(
      and(
        eq(corsairAccounts.tenantId, tenantId),
        eq(corsairAccounts.integrationId, integration.id),
      ),
    )
    .limit(1);
  if (!created) {
    throw new Error(`Failed to create Corsair account for ${tenantId}/${name}`);
  }
  return created;
}

async function ensureIntegrationCredentials() {
  const clientId = env.BETTER_AUTH_GOOGLE_CLIENT_ID;
  const clientSecret = env.BETTER_AUTH_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn(
      "[koda/connect] BETTER_AUTH_GOOGLE_CLIENT_ID/SECRET missing, Corsair " +
        "cannot refresh Google tokens; check .env",
    );
    return;
  }

  const managers = [
    { name: "gmail" as const, keys: corsair.keys.gmail },
    { name: "googlecalendar" as const, keys: corsair.keys.googlecalendar },
  ];
  for (const { name, keys } of managers) {
    try {
      await ensureIntegrationRow(name);
      if (!(await dekExists(() => keys.get_dek()))) {
        await keys.issue_new_dek();
      }
      const existing = await keys.get_client_id();
      if (!existing) {
        await keys.set_client_id(clientId);
        await keys.set_client_secret(clientSecret);
      }
    } catch (error) {
      console.error(
        `[koda/connect] failed setting Corsair integration credentials for ${name}:`,
        error,
      );
    }
  }
}

export async function ensureCorsairConnection(
  userId: string,
): Promise<ConnectionState> {
  try {
    const client = corsair.withTenant(userId);
    const [gmailToken, calendarToken] = await Promise.all([
      client.gmail.keys.get_refresh_token(),
      client.googlecalendar.keys.get_refresh_token(),
    ]);
    if (gmailToken && calendarToken) return "connected";
  } catch (error) {
    void error;
  }

  const account = await getGoogleAccount(userId);
  if (!account) {
    console.warn(`[koda/connect] no google account row for user ${userId}`);
    return "needs-reconnect";
  }
  if (!account.refreshToken) {
    console.warn(
      `[koda/connect] google account for user ${userId} has no refresh token ` +
        `(scope=${account.scope ?? "none"}). Re-auth with offline consent needed.`,
    );
    return "needs-reconnect";
  }

  await ensureIntegrationCredentials();

  const expiresAt = account.accessTokenExpiresAt
    ? String(Math.floor(account.accessTokenExpiresAt.getTime() / 1000))
    : null;

  const client = corsair.withTenant(userId);
  const managers = [
    { name: "gmail" as const, keys: client.gmail.keys },
    { name: "googlecalendar" as const, keys: client.googlecalendar.keys },
  ];
  for (const { name, keys } of managers) {
    try {
      await ensureAccountRow(name, userId);
      if (!(await dekExists(() => keys.get_dek()))) {
        await keys.issue_new_dek();
      }
      await keys.set_refresh_token(account.refreshToken);
      if (account.accessToken) await keys.set_access_token(account.accessToken);
      if (account.scope) await keys.set_scope(account.scope);
      if (expiresAt) await keys.set_expires_at(expiresAt);
    } catch (error) {
      console.error(
        `[koda/connect] failed seeding Corsair ${name} account for tenant ${userId}:`,
        error,
      );
      return "needs-reconnect";
    }
  }

  try {
    const ok = await client.gmail.keys.get_refresh_token();
    if (!ok) {
      console.warn(
        `[koda/connect] tenant ${userId} refresh token not readable after seeding`,
      );
    }
    return ok ? "connected" : "needs-reconnect";
  } catch (error) {
    console.error(
      `[koda/connect] verify read failed for tenant ${userId}:`,
      error,
    );
    return "needs-reconnect";
  }
}
