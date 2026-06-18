import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "~/server/db";
import { aiUsage } from "~/server/db/schema";

export const DAILY_AI_LIMIT = 20;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getAiQuota(
  userId: string,
): Promise<{ used: number; remaining: number; limit: number }> {
  const day = todayKey();
  try {
    const [row] = await db
      .select({ count: aiUsage.count })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day)))
      .limit(1);
    const used = row?.count ?? 0;
    return {
      used,
      remaining: Math.max(0, DAILY_AI_LIMIT - used),
      limit: DAILY_AI_LIMIT,
    };
  } catch {
    return { used: 0, remaining: DAILY_AI_LIMIT, limit: DAILY_AI_LIMIT };
  }
}

export async function consumeAiQuota(
  userId: string,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const day = todayKey();
  try {
    const current = await getAiQuota(userId);
    if (current.remaining <= 0) {
      return { allowed: false, remaining: 0, limit: DAILY_AI_LIMIT };
    }

    const [row] = await db
      .insert(aiUsage)
      .values({ userId, day, count: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.userId, aiUsage.day],
        set: { count: sql`${aiUsage.count} + 1` },
      })
      .returning({ count: aiUsage.count });

    const used = row?.count ?? 1;
    return {
      allowed: used <= DAILY_AI_LIMIT,
      remaining: Math.max(0, DAILY_AI_LIMIT - used),
      limit: DAILY_AI_LIMIT,
    };
  } catch {
    return { allowed: true, remaining: DAILY_AI_LIMIT, limit: DAILY_AI_LIMIT };
  }
}
