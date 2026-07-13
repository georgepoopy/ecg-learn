import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

/**
 * Prisma via the libSQL driver adapter.
 *  - Local dev: TURSO_* unset → a local SQLite/libSQL file at ./prisma/dev.db
 *    (the same file the ingestion scripts write).
 *  - Production: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN → hosted Turso.
 * The application code path is identical either way (see DEPLOY.md).
 */
const url =
  process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.length > 0
    ? process.env.TURSO_DATABASE_URL
    : "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma(): PrismaClient {
  const adapter = new PrismaLibSQL({ url, authToken });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
