import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { KodaLogo } from "../_components/koda-logo";
import { ThemeToggle } from "../_components/theme-toggle";
import { SignInButton } from "./sign-in-button";

export const metadata: Metadata = {
  title: "Sign in | KODA",
  description: "Google sign-in for KODA.",
};

const scopes = [
  {
    icon: "mail",
    title: "Gmail",
    body: "Read threads, then draft and send replies for you.",
  },
  {
    icon: "calendar",
    title: "Calendar",
    body: "Create events, prep blocks, and meeting invites.",
  },
  {
    icon: "shield",
    title: "Private by design",
    body: "Google OAuth only — KODA never stores a password.",
  },
] as const;

function ScopeIcon({ name }: { name: "mail" | "calendar" | "shield" }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4",
  };
  if (name === "mail")
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3.5 7 8.5 6 8.5-6" />
      </svg>
    );
  if (name === "calendar")
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 3l7 3v5c0 4.2-2.9 7.5-7 8.5-4.1-1-7-4.3-7-8.5V6z" />
      <path d="m9 11.5 2 2 4-4" />
    </svg>
  );
}

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/inbox");

  return (
    <main className="relative isolate flex min-h-screen flex-col px-5 py-5 sm:px-6">
      <div className="aurora" aria-hidden />
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <KodaLogo showWordmark />
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1 font-mono text-[11px] tracking-[0.08em] text-[var(--color-text-muted)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            Gmail + Calendar · via Corsair
          </span>
          <h1 className="display mt-5 text-2xl sm:text-[1.75rem]">
            Sign in and your inbox starts working.
          </h1>
          <p className="mt-3 text-[14px] leading-7 text-[var(--color-text-muted)]">
            One Google connection and KODA opens straight into the workspace —
            tracking promises, deadlines, and follow-ups across mail and
            calendar.
          </p>

          <div className="glass mt-7 rounded-[var(--radius-lg)] p-5">
            <SignInButton />

            <div className="mt-5 space-y-3.5 border-t border-[var(--color-line)] pt-5">
              {scopes.map((scope) => (
                <div key={scope.title} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <ScopeIcon name={scope.icon} />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-[var(--color-text)]">
                      {scope.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-5 text-[var(--color-text-muted)]">
                      {scope.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-[12px] leading-5 text-[var(--color-text-soft)]">
            Self-hosted Corsair access stays scoped to your workspace. Revoke
            anytime from your Google account.
          </p>

          <div className="mt-5 text-[13px] text-[var(--color-text-soft)]">
            <Link href="/" className="transition hover:text-[var(--color-text)]">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
