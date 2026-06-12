"use client";

import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

const STORAGE_KEY = "koda-theme";

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nextTheme = getPreferredTheme();
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    setReady(true);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[12px] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
      aria-label="Toggle theme"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          theme === "dark" ? "bg-[var(--color-accent)]" : "bg-[var(--color-warning)]"
        }`}
      />
      <span className="font-mono">
        {ready ? (theme === "dark" ? "Dark" : "Light") : "Theme"}
      </span>
    </button>
  );
}
