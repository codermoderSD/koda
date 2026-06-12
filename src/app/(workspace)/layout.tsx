import Link from "next/link";

import { ThemeToggle } from "../_components/theme-toggle";
import { MobileNav } from "./_components/mobile-nav";
import { ShellNav } from "./_components/shell-nav";

export default function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-3)] font-mono text-[10px] text-[var(--color-text-muted)]">
                SH
              </span>
              <div className="leading-tight">
                <p className="text-[12px] text-[var(--color-text)]">shubham</p>
                <p className="kicker mt-0.5">Gmail · Calendar</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-line)] px-4 sm:px-6">
          <Link
            href="/"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] font-mono text-[13px] font-medium text-[var(--color-surface)] lg:hidden"
          >
            K
          </Link>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-left text-[13px] text-[var(--color-text-soft)] transition hover:border-[var(--color-line-strong)]"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m11 11 3 3" strokeLinecap="round" />
            </svg>
            <span className="truncate">
              Search mail, people, commitments — or ask KODA
            </span>
            <kbd className="ml-auto hidden shrink-0 rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-soft)] sm:block">
              ⌘K
            </kbd>
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-muted)]">
              Focused
            </span>
            <span className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-muted)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
              Synced
            </span>
          </div>

          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:flex lg:overflow-hidden lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
