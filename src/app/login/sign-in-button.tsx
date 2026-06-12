"use client";

import { useState } from "react";

import { authClient } from "~/server/better-auth/client";

export function SignInButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/inbox",
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/calendar",
        ],
      });

      if (result?.error) {
        console.error("Google sign-in failed", result.error);
      }
    } catch (error) {
      console.error("Google sign-in failed", error);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-[var(--radius)] bg-[var(--color-text)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-surface)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-surface)] font-mono text-[10px] font-semibold text-[var(--color-text)]">
        G
      </span>
      {pending ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );
}
