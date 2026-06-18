import "server-only";

import { env } from "~/env";
import { getSession } from "~/server/better-auth/server";

export const DEFAULT_KODA_TENANT_ID = env.KODA_TENANT_ID ?? "shubham";

export async function getTenantId(): Promise<string> {
  const session = await getSession();
  if (session?.user?.id) return session.user.id;

  return DEFAULT_KODA_TENANT_ID;
}
