import { auth } from ".";
import { headers } from "next/headers";
import { cache } from "react";

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export const getOptionalSession = cache(async () => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.error("Failed to get optional session", error);
    return null;
  }
});
