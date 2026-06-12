import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "../_components/theme-toggle";
import { SignInButton } from "./sign-in-button";

export const metadata: Metadata = {
  title: "Sign in | KODA",
  description: "Google sign-in for KODA.",
};

const scopes = [
  ["Gmail", "Read threads, draft and send replies."],
  ["Calendar", "Create events, prep blocks, and invites."],
  ["Identity", "Google account only — no passwords stored."],
] as const;

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col px-5 py-5 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] font-mono text-[13px] font-medium text-[var(--color-surface)]">
            K
          </span>
          <span className="text-[15px] font-medium tracking-tight">KODA</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <p className="kicker text-[var(--color-accent)]">Access</p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight text-[var(--color-text)]">
            Connect the Google account that runs your inbox.
          </h1>
          <p className="mt-3 text-[14px] leading-7 text-[var(--color-text-muted)]">
            KODA is built around Gmail and Calendar. Sign in and the product opens
            straight into the workspace.
          </p>

          <div className="mt-7 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5">
            <SignInButton />

            <div className="mt-5 space-y-3 border-t border-[var(--color-line)] pt-5">
              {scopes.map(([title, body]) => (
                <div key={title} className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-soft)] uppercase">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-5 text-[var(--color-text-muted)]">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-[12px] leading-5 text-[var(--color-text-soft)]">
            Self-hosted Corsair tenant access stays scoped to the connected
            workspace.
          </p>

          <div className="mt-5 flex items-center justify-between text-[13px] text-[var(--color-text-soft)]">
            <Link href="/" className="transition hover:text-[var(--color-text)]">
              ← Back
            </Link>
            <Link
              href="/inbox"
              className="transition hover:text-[var(--color-text)]"
            >
              Preview workspace →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
