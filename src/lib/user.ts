import { prisma } from "@/lib/prisma";

/**
 * Current user id. Single-user ("local") for now; Phase 4 swaps this to read the
 * authenticated session so every query is automatically per-user. Centralising
 * it here means the rest of the app never hard-codes "local".
 */
export async function getUserId(): Promise<string> {
  // Phase 4: return (await auth())?.user?.id ?? throw/redirect.
  return "local";
}

/** Ensure the current user row exists (no-op once auth creates users). */
export async function ensureUser(userId: string): Promise<void> {
  await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId } });
}
