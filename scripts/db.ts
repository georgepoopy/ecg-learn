/**
 * Prisma client for the standalone ingestion/maintenance scripts. Uses the same
 * libSQL adapter as the app so it needs no DATABASE_URL env at runtime: local
 * runs hit ./prisma/dev.db; set TURSO_* to target a hosted Turso database.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const url =
  process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.length > 0
    ? process.env.TURSO_DATABASE_URL
    : "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export function makePrisma(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaLibSQL({ url, authToken }) });
}
