/** Pure-logic check of the sequential-unlock progression (no DB). */
import { SEQUENCE, prereqOf, demonstratedCompetence, TYPE_LOCATION } from "../src/lib/categories";

type Prog = { unlocked: boolean; mastered: boolean; seen: number; correct: number; mastery: number };
const EMPTY: Prog = { unlocked: false, mastered: false, seen: 0, correct: 0, mastery: 0 };

function statusOf(id: string, snap: Map<string, Prog>): string {
  const s = snap.get(id) ?? EMPTY;
  if (s.mastered) return "mastered";
  if (s.unlocked) return "learning";
  const pre = prereqOf(id);
  const p = pre ? snap.get(pre) ?? EMPTY : null;
  const met = !pre || demonstratedCompetence(p!.seen, p!.correct, p!.mastery);
  return met ? "available" : "locked";
}

console.log(`Sequence length: ${SEQUENCE.length} (expect 26)`);
console.log(`First: ${SEQUENCE[0]} · Last: ${SEQUENCE[SEQUENCE.length - 1]}`);
console.log(`Every type has a category: ${SEQUENCE.every((id) => TYPE_LOCATION[id]) ? "yes" : "NO"}`);

// Fresh user: only the first is available, the rest locked.
const fresh = new Map<string, Prog>();
const available = SEQUENCE.filter((id) => statusOf(id, fresh) === "available");
const locked = SEQUENCE.filter((id) => statusOf(id, fresh) === "locked");
console.log(`\nFresh user → available: [${available.join(", ")}]  (expect only ${SEQUENCE[0]})`);
console.log(`Fresh user → locked count: ${locked.length} (expect 25)`);

// After demonstrating competence on the first type, the second becomes available.
const after = new Map<string, Prog>([
  [SEQUENCE[0], { unlocked: true, mastered: false, seen: 8, correct: 7, mastery: 0.35 }],
]);
console.log(`\nAfter competence on ${SEQUENCE[0]}:`);
console.log(`  ${SEQUENCE[0]} → ${statusOf(SEQUENCE[0], after)} (expect learning)`);
console.log(`  ${SEQUENCE[1]} → ${statusOf(SEQUENCE[1], after)} (expect available)`);
console.log(`  ${SEQUENCE[2]} → ${statusOf(SEQUENCE[2], after)} (expect locked)`);
