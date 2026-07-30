/**
 * Seed a hosted Turso/libSQL database from the finished local `prisma/dev.db`.
 *
 * Windows has no Turso CLI, so instead of `turso db create --from-file` this
 * copies the schema + content over the network with the libSQL client. Reads
 * TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from your local `.env`.
 *
 * Run:  npm run seed:remote
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const ROOT = path.resolve(__dirname, "..");

// --- tiny .env reader (tsx doesn't auto-load .env) --------------------------
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = { ...process.env } as Record<string, string>;
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (v) out[m[1]] = v;
    }
  }
  return out;
}

// Content tables, in foreign-key-safe insert order. User/progress/attempt tables
// are intentionally left empty — each new visitor starts fresh.
const TABLES = ["EcgType", "Record", "Lesson", "Question"];
const CHUNK: Record<string, number> = { Record: 20, Question: 100, EcgType: 100, Lesson: 100 };

async function main() {
  const env = loadEnv();
  const url = env.TURSO_DATABASE_URL?.trim();
  const authToken = env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !url.startsWith("libsql")) {
    throw new Error(
      "TURSO_DATABASE_URL is not set (or not a libsql:// URL) in .env. " +
        "Create a Turso database, then put its URL + token in .env. See DEPLOY.md.",
    );
  }
  if (!authToken) throw new Error("TURSO_AUTH_TOKEN is not set in .env. See DEPLOY.md.");

  const local = createClient({ url: "file:prisma/dev.db" });
  const remote = createClient({ url, authToken });
  console.log(`→ Seeding ${url}`);

  // 1) Schema.
  const schemaPath = path.join(ROOT, "prisma", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8").replace(/^﻿/, "");
  const statements = schema
    .split(";")
    // drop comment lines (Prisma prefixes each statement with `-- CreateTable`)
    .map((s) => s.split(/\r?\n/).filter((l) => !l.trim().startsWith("--")).join("\n").trim())
    .filter((s) => s.length > 0);
  let created = 0;
  for (const stmt of statements) {
    try {
      await remote.execute(stmt);
      created++;
    } catch (e) {
      // ignore "already exists" so the script is re-runnable
      if (!/already exists/i.test(String((e as Error).message))) throw e;
    }
  }
  console.log(`  schema: ${created} statement(s) applied`);

  // 2) Content — clear then copy (idempotent).
  for (const table of [...TABLES].reverse()) {
    try { await remote.execute(`DELETE FROM "${table}"`); } catch { /* table may be empty/new */ }
  }
  for (const table of TABLES) {
    const res = await local.execute(`SELECT * FROM "${table}"`);
    const cols = res.columns;
    if (res.rows.length === 0) { console.log(`  ${table}: 0 rows`); continue; }
    const placeholders = cols.map(() => "?").join(",");
    const colList = cols.map((c) => `"${c}"`).join(",");
    const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;
    const size = CHUNK[table] ?? 100;
    let done = 0;
    for (let i = 0; i < res.rows.length; i += size) {
      const batch = res.rows.slice(i, i + size).map((row) => ({
        sql,
        args: cols.map((c) => (row as Record<string, unknown>)[c] as never),
      }));
      await remote.batch(batch, "write");
      done += batch.length;
    }
    console.log(`  ${table}: ${done} rows copied`);
  }

  // 3) Sanity read-back.
  const q = await remote.execute("SELECT COUNT(*) AS n FROM \"Question\"");
  const t = await remote.execute("SELECT COUNT(*) AS n FROM \"EcgType\"");
  console.log(`\n✔ Remote now has ${t.rows[0].n} types and ${q.rows[0].n} questions.`);
  console.log("  (User accounts + progress start empty — each visitor gets their own.)");
}

main().catch((e) => { console.error("\n✗ " + (e as Error).message); process.exit(1); });
