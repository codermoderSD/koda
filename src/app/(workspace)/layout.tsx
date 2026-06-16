import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { ensureCorsairConnection } from "~/server/koda/connect";
import { getAiQuota } from "~/server/koda/usage";
import { AiCredits } from "./_components/ai-credits";
import { EnquiryDialog, EnquiryTrigger } from "./_components/enquiry-form";
import { KodaLogo } from "../_components/koda-logo";
import { SignInButton } from "../login/sign-in-button";
import { ThemeToggle } from "../_components/theme-toggle";
import { CommandBar } from "./_components/command-bar";
import { MobileNav } from "./_components/mobile-nav";
import { ShellNav } from "./_components/shell-nav";
import { SignOutButton } from "./_components/sign-out-button";
import { SyncButton } from "./_components/sync-button";

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

  const aiQuota = await getAiQuota(user.id);

  const connection = await ensureCorsairConnection(user.id);
  if (connection === "needs-reconnect") {
    return (
      <div className="relative isolate flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-5 text-[var(--color-text)]">
        <div className="aurora" aria-hidden />
        <div className="glass w-full max-w-sm rounded-[var(--radius-lg)] p-6">
          <p className="kicker text-[var(--color-accent)]">Connect</p>
          <h1 className="mt-3 text-xl font-medium tracking-tight">
            Authorize Gmail &amp; Calendar
          </h1>
          <p className="mt-3 text-[14px] leading-7 text-[var(--color-text-muted)]">
            KODA needs a Google refresh token to sync {displayName}&apos;s mail
            and calendar through Corsair. Continue with Google and approve
            access to finish setup.
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
    <div className="relative isolate flex h-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]">
      <div className="aurora -z-10" aria-hidden />
      <aside className="hidden w-[256px] shrink-0 flex-col border-r border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-2)_88%,transparent)] backdrop-blur-xl lg:flex">
        <Link
          href="/"
          className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-4 py-4"
        >
          <KodaLogo markClassName="h-7 w-7 shrink-0" />
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
        </div>

        <div className="space-y-4 border-t border-[var(--color-line)] p-4">
          <div className="space-y-2">
            <p className="kicker">Shortcuts</p>
            <div className="space-y-1.5 text-[12px] text-[var(--color-text-muted)]">
              <p className="flex items-center gap-2">
                <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text)]">
                  ⌘ + K
                </kbd>
                Ask KODA
              </p>
              <p className="flex items-center gap-2">
                <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text)]">
                  ⌘ + ⇧ + K
                </kbd>
                Voice input
              </p>
            </div>
          </div>

          <EnquiryTrigger />

          <AiCredits initial={aiQuota} />

          <SignOutButton full />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-line)] px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <KodaLogo
              showWordmark
              markClassName="h-7 w-7 shrink-0"
              wordmarkClassName="text-[14px] font-medium tracking-tight text-[var(--color-text)]"
            />
          </Link>

          <SyncButton />

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/profile"
              className="tap flex items-center gap-2 rounded-[var(--radius)] py-1 pr-2 pl-1 transition hover:bg-[var(--color-panel)]"
              title="Profile & preferences"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-3)] font-mono text-[10px] text-[var(--color-text-muted)]">
                {avatar}
              </span>
              <span className="hidden max-w-[140px] truncate text-[13px] text-[var(--color-text)] sm:inline">
                {displayName}
              </span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:flex lg:pb-8">
          {children}
        </main>
      </div>

      <CommandBar />
      <MobileNav />
      <EnquiryDialog />
    </div>
  );
}
