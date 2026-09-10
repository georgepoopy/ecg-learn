/**
 * Reserve tools — inspect / rebalance a user's practice bank so a freshly-learned
 * type isn't dumped on them all at once.
 *
 *   npm run reserve:stats            # inspect local dev.db
 *   npm run reserve:stats -- --prod  # inspect production (Turso, creds from .env)
 *   npm run reserve:rebalance        # rebalance dev.db
 *   npm run reserve:rebalance -- --prod
 *
 * "Rebalance" finds UNSEEN cards (never answered) that are currently due and, for
 * any type with more than INITIAL_ACTIVE of them, parks the surplus in reserve
 * (far-future due). It NEVER touches a card you've already answered, so real
 * progress and FSRS schedules are preserved. Idempotent.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import fs from "node:fs";
import path from "node:path";

const INITIAL_ACTIVE = 12;
const RESERVE_OFFSET_MS = 3650 * 86_400_000;

const useProd = process.argv.includes("--prod");
const doWrite = process.argv.includes("rebalance") || process.argv[2] === "rebalance";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  const p = path.join(process.cwd(), ".env");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function makeClient(): PrismaClient {
  const env = loadEnv();
  if (useProd) {
    const url = env.TURSO_DATABASE_URL?.trim();
    const authToken = env.TURSO_AUTH_TOKEN?.trim();
    if (!url || !url.startsWith("libsql://")) throw new Error("TURSO_DATABASE_URL missing in .env");
    if (!authToken) throw new Error("TURSO_AUTH_TOKEN missing in .env");
    return new PrismaClient({ adapter: new PrismaLibSQL({ url, authToken }) });
  }
  return new PrismaClient({ adapter: new PrismaLibSQL({ url: "file:./prisma/dev.db" }) });
}

function roundRobinByKind<T extends { kind: string }>(items: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const q of items) (buckets.get(q.kind) ?? buckets.set(q.kind, []).get(q.kind)!).push(q);
  const lists = [...buckets.values()];
  const out: T[] = [];
  for (let more = true; more; ) {
    more = false;
    for (const l of lists) {
      const x = l.shift();
      if (x) { out.push(x); more = true; }
    }
  }
  return out;
}

async function main() {
  const prisma = makeClient();
  const now = new Date();
  console.log(`Target: ${useProd ? "PRODUCTION (Turso)" : "local dev.db"} · mode: ${doWrite ? "REBALANCE" : "stats"}\n`);

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const u of users) {
    const unlocked = await prisma.typeProgress.findMany({
      where: { userId: u.id, unlocked: true },
      select: { typeId: true },
    });
    if (unlocked.length === 0) continue;
    console.log(`User ${u.email ?? u.id}:`);
    for (const { typeId } of unlocked) {
      const states = await prisma.questionState.findMany({
        where: { userId: u.id, question: { typeId } },
        select: { questionId: true, reps: true, dueAt: true, question: { select: { kind: true } } },
      });
      const seen = states.filter((s) => s.reps > 0);
      const unseen = states.filter((s) => s.reps === 0);
      const unseenDue = unseen.filter((s) => s.dueAt.getTime() <= now.getTime());
      const seenDue = seen.filter((s) => s.dueAt.getTime() <= now.getTime());
      const reserve = unseen.filter((s) => s.dueAt.getTime() > now.getTime());

      let action = "";
      if (doWrite && unseenDue.length > INITIAL_ACTIVE) {
        const ordered = roundRobinByKind(
          unseenDue.map((s) => ({ id: s.questionId, kind: s.question.kind })),
        );
        const keep = new Set(ordered.slice(0, INITIAL_ACTIVE).map((q) => q.id));
        const demote = unseenDue.filter((s) => !keep.has(s.questionId)).map((s) => s.questionId);
        const reserveDue = new Date(now.getTime() + RESERVE_OFFSET_MS);
        // Chunk the UPDATE to stay comfortably within libSQL statement limits.
        for (let i = 0; i < demote.length; i += 100) {
          await prisma.questionState.updateMany({
            where: { userId: u.id, questionId: { in: demote.slice(i, i + 100) } },
            data: { dueAt: reserveDue },
          });
        }
        action = `  → parked ${demote.length} unseen cards in reserve (kept ${INITIAL_ACTIVE} active)`;
      }

      console.log(
        `  ${typeId.padEnd(24)} due=${(seenDue.length + unseenDue.length)
          .toString()
          .padStart(3)} (seen ${seenDue.length}, unseen ${unseenDue.length}) · reserve=${reserve.length} · total=${states.length}`,
      );
      if (action) console.log(action);
    }
  }
  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
