import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Current user id from the auth session. Unauthenticated callers are redirected
 * to /signin. Because every read query and mutation goes through this, the whole
 * app is automatically per-user and private.
 */
export async function getUserId(): Promise<string> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) redirect("/signin");
  return id;
}

/** Like getUserId but returns null instead of redirecting (for optional UI). */
export async function getUserIdOptional(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

/** Ensure the current user row exists (no-op once auth has created it). */
export async function ensureUser(userId: string): Promise<void> {
  await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId } });
}
