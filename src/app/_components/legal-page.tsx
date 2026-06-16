import type { ReactNode } from "react";
import Link from "next/link";

import { KodaLogo } from "./koda-logo";
import { ThemeToggle } from "./theme-toggle";

type LegalSection = {
  title: string;
  body: ReactNode;
};

export function LegalPage({
  title,
  description,
  updatedAt,
  sections,
}: {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <main className="relative isolate min-h-screen px-5 py-5 sm:px-6">
      <div className="aurora" aria-hidden />
      <div className="grid-texture absolute inset-0 -z-10" aria-hidden />

      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <KodaLogo showWordmark />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-[var(--radius)] bg-[var(--color-text)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--color-surface)] transition hover:opacity-90 sm:inline-flex"
          >
            Sign in
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <article className="mx-auto max-w-3xl py-14 sm:py-20">
        <p className="kicker text-[var(--color-accent)]">Legal</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-5 text-[15px] leading-7 text-[var(--color-text-muted)]">
          {description}
        </p>
        <p className="mt-4 font-mono text-[11px] tracking-[0.08em] text-[var(--color-text-soft)] uppercase">
          Last updated {updatedAt}
        </p>

        <div className="mt-10 divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)]">
          {sections.map((section) => (
            <section key={section.title} className="p-5 sm:p-7">
              <h2 className="text-[18px] font-medium text-[var(--color-text)]">
                {section.title}
              </h2>
              <div className="legal-copy mt-4 text-[14px] leading-7 text-[var(--color-text-muted)]">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-[var(--color-line)] pt-5 text-[13px] text-[var(--color-text-soft)] sm:flex-row">
          <Link href="/" className="transition hover:text-[var(--color-text)]">
            Back to home
          </Link>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="transition hover:text-[var(--color-text)]"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition hover:text-[var(--color-text)]"
            >
              Terms
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
