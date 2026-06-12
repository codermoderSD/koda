import "server-only";

import { and, eq } from "drizzle-orm";

import { env } from "~/env";
import { corsair } from "~/server/corsair";
import { db } from "~/server/db";
import { accounts } from "~/server/db/schema";

export type ConnectionState = "connected" | "needs-reconnect";

/** The logged-in user's stored Google OAuth tokens (from Better Auth). */
async function getGoogleAccount(userId: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "google")))
    .limit(1);
  return row ?? null;
}

/**
 * Ensures Corsair's shared integration-level Google client matches the Better
 * Auth client, so refresh tokens issued at login work when Corsair refreshes.
 * Idempotent — only writes when the client id is not already set.
 */
async function ensureIntegrationCredentials() {
  const clientId = env.BETTER_AUTH_GOOGLE_CLIENT_ID;
  const clientSecret = env.BETTER_AUTH_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return;

  const managers = [corsair.keys.gmail, corsair.keys.googlecalendar];
  for (const keys of managers) {
    try {
      const existing = await keys.get_client_id();
      if (!existing) {
        await keys.set_client_id(clientId);
        await keys.set_client_secret(clientSecret);
      }
    } catch {
      // best-effort; a missing integration credential surfaces as needs-reconnect later
    }
  }
}

/**
 * Seeds the current user's Google tokens into a tenant-scoped Corsair account so
 * Gmail/Calendar reads work for them. Single OAuth: the tokens come from the
 * login consent — no second authorization screen.
 *
 * Returns "connected" once the tenant has a usable refresh token, otherwise
 * "needs-reconnect" (the user must re-authorize Google to mint a refresh token).
 */
export async function ensureCorsairConnection(
  userId: string,
): Promise<ConnectionState> {
  // Already seeded — cheap short-circuit on every workspace load. Check both
  // plugins; older sessions may have Gmail seeded while Calendar is still empty.
  try {
    const client = corsair.withTenant(userId);
    const [gmailToken, calendarToken] = await Promise.all([
      client.gmail.keys.get_refresh_token(),
      client.googlecalendar.keys.get_refresh_token(),
    ]);
    if (gmailToken && calendarToken) return "connected";
  } catch {
    // fall through and attempt to seed
  }

  const account = await getGoogleAccount(userId);
  if (!account?.refreshToken) return "needs-reconnect";

  await ensureIntegrationCredentials();

  const expiresAt = account.accessTokenExpiresAt
    ? String(Math.floor(account.accessTokenExpiresAt.getTime() / 1000))
    : null;

  const client = corsair.withTenant(userId);
  for (const keys of [client.gmail.keys, client.googlecalendar.keys]) {
    try {
      await keys.set_refresh_token(account.refreshToken);
      if (account.accessToken) await keys.set_access_token(account.accessToken);
      if (account.scope) await keys.set_scope(account.scope);
      if (expiresAt) await keys.set_expires_at(expiresAt);
    } catch {
      return "needs-reconnect";
    }
  }

  try {
    const ok = await client.gmail.keys.get_refresh_token();
    return ok ? "connected" : "needs-reconnect";
  } catch {
    return "needs-reconnect";
  }
}
