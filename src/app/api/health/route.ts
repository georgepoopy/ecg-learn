import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary deployment diagnostic. Reports whether the required env vars are
 * present (booleans + the token LENGTH, never the values) and whether the
 * database is reachable, returning the real error if not. Safe to expose: it
 * leaks no secrets. Remove once the deployment is confirmed healthy.
 */
export async function GET() {
  const url = process.env.TURSO_DATABASE_URL ?? "";
  const token = process.env.TURSO_AUTH_TOKEN ?? "";
  const env = {
    TURSO_DATABASE_URL_present: url.length > 0,
    TURSO_DATABASE_URL_prefix: url.slice(0, 22), // non-secret host prefix
    TURSO_AUTH_TOKEN_present: token.length > 0,
    TURSO_AUTH_TOKEN_length: token.length, // ~300+ when intact; short = truncated
    AUTH_SECRET_present: (process.env.AUTH_SECRET ?? "").length > 0,
    NODE_ENV: process.env.NODE_ENV,
  };

  let db: string;
  try {
    const { prisma } = await import("@/lib/prisma");
    const types = await prisma.ecgType.count();
    const questions = await prisma.question.count();
    db = `ok — ${types} types, ${questions} questions`;
  } catch (e) {
    db = "ERROR: " + ((e as Error)?.message ?? String(e));
  }

  return NextResponse.json({ ok: db.startsWith("ok"), env, db }, { status: 200 });
}
