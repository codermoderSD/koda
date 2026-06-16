import "server-only";

import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { userSettings } from "~/server/db/schema";

export type UserSettings = {
  defaultView: string;
  commitmentConfidenceThreshold: number;
  autoDraftFollowups: boolean;
  followupLeadTimeHours: number;
  keyboardShortcutsEnabled: boolean;
  commitmentRetentionDays: number;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultView: "inbox",
  commitmentConfidenceThreshold: 0.7,
  autoDraftFollowups: true,
  followupLeadTimeHours: 24,
  keyboardShortcutsEnabled: true,
  commitmentRetentionDays: 7,
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!row) return DEFAULT_USER_SETTINGS;

    return {
      defaultView: row.defaultView,
      commitmentConfidenceThreshold: Number(row.commitmentConfidenceThreshold),
      autoDraftFollowups: row.autoDraftFollowups,
      followupLeadTimeHours: row.followupLeadTimeHours,
      keyboardShortcutsEnabled: row.keyboardShortcutsEnabled,
      commitmentRetentionDays: row.commitmentRetentionDays,
    };
  } catch {
    // Tolerate a not-yet-migrated DB so the app keeps working.
    return DEFAULT_USER_SETTINGS;
  }
}

export async function upsertUserSettings(
  userId: string,
  values: UserSettings,
): Promise<UserSettings> {
  const row = {
    defaultView: values.defaultView,
    commitmentConfidenceThreshold:
      values.commitmentConfidenceThreshold.toFixed(2),
    autoDraftFollowups: values.autoDraftFollowups,
    followupLeadTimeHours: values.followupLeadTimeHours,
    keyboardShortcutsEnabled: values.keyboardShortcutsEnabled,
    commitmentRetentionDays: values.commitmentRetentionDays,
  };

  await db
    .insert(userSettings)
    .values({ userId, ...row })
    .onConflictDoUpdate({ target: userSettings.userId, set: row });

  return values;
}
