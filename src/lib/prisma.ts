import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

/**
 * Prisma via the libSQL driver adapter.
 *  - Local dev: TURSO_* unset → a local SQLite/libSQL file at ./prisma/dev.db
 *    (the same file the ingestion scripts write).
 *  - Production: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN → hosted Turso.
 * The application code path is identical either way (see DEPLOY.md).
 *
 * The client is created LAZILY (on first DB use) via a Proxy, so importing this
 * module during `next build` never touches the database. On a serverless host
 * there is no writable local file, so in production we REQUIRE TURSO_DATABASE_URL
 * and fail loudly on first use if it's missing — surfacing a misconfiguration
 * instead of silently reading a non-existent file.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();

  if (process.env.NODE_ENV === "production" && !tursoUrl) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Production requires a hosted libSQL/Turso " +
        "database — set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. See DEPLOY.md.",
    );
  }

  const url = tursoUrl && tursoUrl.length > 0 ? tursoUrl : "file:./prisma/dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  const client = new PrismaClient({
    adapter: new PrismaLibSQL({ url, authToken }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

function getPrisma(): PrismaClient {
  return (globalForPrisma.prisma ??= createPrisma());
}

/** Lazily-initialised Prisma client — safe to import at build time. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
