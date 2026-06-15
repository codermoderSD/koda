"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSession } from "~/server/better-auth/server";
import { upsertUserSettings, type UserSettings } from "~/server/koda/settings";

const settingsSchema = z.object({
  defaultView: z.enum(["inbox", "commitments", "calendar"]),
  commitmentConfidenceThreshold: z.number().min(0).max(1),
  autoDraftFollowups: z.boolean(),
  followupLeadTimeHours: z.number().int().min(1).max(168),
  keyboardShortcutsEnabled: z.boolean(),
});

export async function saveSettings(
  values: UserSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid preferences." };

  try {
    await upsertUserSettings(session.user.id, parsed.data);
    revalidatePath("/profile");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save preferences." };
  }
}
