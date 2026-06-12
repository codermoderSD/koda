import "server-only";

import { env } from "~/env";
import { getSession } from "~/server/better-auth/server";

/**
 * Fallback tenant used by background/webhook contexts that have no session.
 * Defaults to the manually-connected dev tenant until self-serve connect lands.
 */
export const DEFAULT_KODA_TENANT_ID = env.KODA_TENANT_ID ?? "shubham";

/**
 * Resolves the Corsair tenant for the current request.
 *
 * The authenticated user's id is the multi-tenant key. Their Google tokens are
 * synced into a Corsair account under this tenant on login (see ./connect).
 * `DEFAULT_KODA_TENANT_ID` is only used by session-less contexts (webhooks).
 */
export async function getTenantId(): Promise<string> {
  const session = await getSession();
  if (session?.user?.id) return session.user.id;

  // No session (e.g. webhook/background contexts): fall back to the env tenant.
  return DEFAULT_KODA_TENANT_ID;
}
