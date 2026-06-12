import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { ensureCorsairConnection } from "~/server/koda/connect";
import { SignInButton } from "../login/sign-in-button";
import { ThemeToggle } from "../_components/theme-toggle";
import { CommandBar } from "./_components/command-bar";
import { MobileNav } from "./_components/mobile-nav";
import { ShellNav } from "./_components/shell-nav";
import { SignOutButton } from "./_components/sign-out-button";

function initials(value: string) {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user;
  const displayName = user.name || user.email;
  const avatar = initials(displayName);

  const connection = await ensureCorsairConnection(user.id);
  if (connection === "needs-reconnect") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-5 text-[var(--color-text)]">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-6">
          <p className="kicker text-[var(--color-accent)]">Connect</p>
          <h1 className="mt-3 text-xl font-medium tracking-tight">
            Authorize Gmail &amp; Calendar
          </h1>
          <p className="mt-3 text-[14px] leading-7 text-[var(--color-text-muted)]">
            KODA needs offline access to sync {displayName}&apos;s mail and
            calendar. Continue with Google to grant it — you only do this once.
          </p>
          <SignInButton />
          <div className="mt-4 flex justify-end">
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]">
      <aside className="hidden w-[256px] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface-2)] lg:flex">
        <Link
          href="/"
          className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-4 py-4"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] font-mono text-[13px] font-medium text-[var(--color-surface)]">
            K
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-medium tracking-tight text-[var(--color-text)]">
              KODA
            </p>
            <p className="kicker mt-0.5">Execution layer</p>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="kicker px-2 pb-2">Workspace</p>
          <ShellNav />

          <div className="mt-6 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
              <p className="kicker text-[var(--color-text-muted)]">
                Corsair · live
              </p>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--color-text-soft)]">
              Tenant-scoped Gmail &amp; Calendar sync, projected into KODA&apos;s
              own operational tables.
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--color-line)] px-3 py-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-3)] font-mono text-[10px] text-[var(--color-text-muted)]">
                {avatar}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[12px] text-[var(--color-text)]">
                  {displayName}
                </p>
                <p className="kicker mt-0.5">Gmail · Calendar</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-line)] px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 lg:hidden"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] font-mono text-[13px] font-medium text-[var(--color-surface)]">
              K
            </span>
            <span className="text-[14px] font-medium tracking-tight text-[var(--color-text)]">
              KODA
            </span>
          </Link>

          <span className="hidden items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-muted)] lg:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
            Gmail &amp; Calendar synced
          </span>

          <div className="ml-auto lg:hidden">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-40 sm:px-6 sm:py-6 lg:flex lg:overflow-hidden lg:pb-20">
          {children}
        </main>
      </div>

      <CommandBar />
      <MobileNav />
    </div>
  );
}
