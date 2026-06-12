import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "~/env";
import { db } from "~/server/db";
import { ensureCorsairConnection } from "~/server/koda/connect";
import * as schema from "~/server/db/schema";

async function seedTenant(account: { providerId: string; userId: string }) {
  if (account.providerId !== "google") return;
  try {
    await ensureCorsairConnection(account.userId);
  } catch {
    // best-effort; layout re-checks and shows a reconnect prompt if needed
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // Seed the Corsair tenant with the user's Google tokens the moment they are
  // written at the OAuth callback — before any page renders. Single sign-in.
  databaseHooks: {
    account: {
      create: { after: seedTenant },
      update: { after: seedTenant },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: ["http://localhost:3000", "http://localhost:3001"],
  socialProviders: {
    google: {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET!,
      // Force a refresh token + the Gmail/Calendar scopes at the login consent so
      // the tokens can be handed to Corsair (tenant = user id). Same Google OAuth
      // client is shared with Corsair so the refresh token works there too.
      accessType: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/calendar",
      ],
    },
  },
});

export type Session = typeof auth.$Infer.Session;
