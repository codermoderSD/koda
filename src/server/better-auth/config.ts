import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "~/env";
import { db } from "~/server/db";
import { ensureCorsairConnection } from "~/server/koda/connect";
import * as schema from "~/server/db/schema";

function toOrigin(url: string | undefined) {
  if (!url) return undefined;

  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    return new URL(normalizedUrl).origin;
  } catch {
    return undefined;
  }
}

const extraTrustedOrigins =
  env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((origin) => toOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin)) ?? [];

const trustedOrigins = Array.from(
  new Set(
    [
      "http://localhost:3000",
      "http://localhost:3001",
      toOrigin(env.BETTER_AUTH_URL),
      toOrigin(env.VERCEL_URL),
      ...extraTrustedOrigins,
    ].filter((origin): origin is string => Boolean(origin)),
  ),
);

async function seedTenant(account: { providerId: string; userId: string }) {
  if (account.providerId !== "google") return;
  try {
    await ensureCorsairConnection(account.userId);
  } catch (error) {
    void error;
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  databaseHooks: {
    account: {
      create: { after: seedTenant },
      update: { after: seedTenant },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  socialProviders: {
    google: {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET!,
      // Google may omit refresh_token on returning sign-ins unless consent is forced.
      accessType: "offline",
      prompt: "select_account consent",
      scope: [
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/calendar",
      ],
    },
  },
});

export type Session = typeof auth.$Infer.Session;
