"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { KodaLogo } from "./koda-logo";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Workspace", href: "/inbox" },
] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_82%,transparent)] backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <KodaLogo showWordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[var(--radius)] px-3 py-1.5 text-[13px] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden rounded-[var(--radius)] bg-[var(--color-text)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--color-surface)] transition hover:opacity-90 sm:inline-flex"
          >
            Get started
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)] md:hidden"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-3 md:hidden">
          <nav className="flex flex-col gap-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius)] px-3 py-2.5 text-[14px] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-[var(--radius)] bg-[var(--color-text)] px-3 py-2.5 text-center text-[14px] font-medium text-[var(--color-surface)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
