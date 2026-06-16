import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { getUserSettings } from "~/server/koda/settings";
import { SignOutButton } from "../_components/sign-out-button";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profile & preferences | KODA",
};

function initials(value: string) {
  return (
    value
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user;
  const displayName = user.name || user.email;
  const settings = await getUserSettings(user.id);

  return (
    <div className="mx-auto mb-10 flex w-full max-w-3xl flex-col gap-6 pb-10">
      <header>
        <p className="kicker text-[var(--color-accent)]">Account</p>
        <h1 className="display mt-1.5 text-2xl sm:text-3xl">
          Profile &amp; preferences
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Tune how KODA reads your inbox and drafts on your behalf.
        </p>
      </header>

      {/* Identity */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-3)] font-mono text-[14px] text-[var(--color-text-muted)]">
              {initials(displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-[var(--color-text)]">
                {displayName}
              </p>
              <p className="truncate text-[12px] text-[var(--color-text-soft)]">
                {user.email}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-line)] pt-4 text-[12px] text-[var(--color-text-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          <span className="font-mono tracking-[0.04em]">
            Gmail &amp; Calendar connected via Corsair
          </span>
        </div>
      </section>

      <ProfileForm initial={settings} />
    </div>
  );
}
