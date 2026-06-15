"use client";

import { useState } from "react";

import { authClient } from "~/server/better-auth/client";

export function SignOutButton({ full = false }: { full?: boolean }) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  const icon = (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" />
      <path d="M10.5 11 14 7.5 10.5 4" />
      <path d="M14 7.5H6" />
    </svg>
  );

  if (full) {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="tap flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)] disabled:opacity-50"
      >
        {icon}
        {pending ? "Signing out…" : "Sign out"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      aria-label="Sign out"
      title="Sign out"
      className="tap flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)] disabled:opacity-50"
    >
      {icon}
    </button>
  );
}
