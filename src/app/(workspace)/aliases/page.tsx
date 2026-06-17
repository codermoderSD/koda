import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { listAliases } from "~/server/koda/aliases";
import { AliasesClient } from "./aliases-client";

export const metadata: Metadata = {
  title: "Email aliases | KODA",
};

export default async function AliasesPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const aliases = await listAliases(session.user.id);

  return (
    <div className="flex w-full flex-col items-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="kicker text-[var(--color-accent)]">Shortcuts</p>
          <h1 className="display mt-2 text-2xl sm:text-3xl">Email aliases</h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-[var(--color-text-soft)]">
            Type{" "}
            <span className="font-mono text-[var(--color-text)]">@handle</span>{" "}
            in compose to quickly address any contact. KODA resolves aliases to
            real email addresses before sending.
          </p>
        </div>
        <AliasesClient initialAliases={aliases} />
      </div>
    </div>
  );
}
