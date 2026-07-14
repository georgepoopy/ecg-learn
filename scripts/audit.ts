/**
 * Quality audit for the question bank. Guards against near-duplicates and
 * malformed/mislabeled items as volume grows. Reports (does not mutate).
 *
 * Run: npm run audit
 */
import { makePrisma } from "./db";

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

async function main() {
  const prisma = makePrisma();
  let problems = 0;
  const flag = (msg: string) => { problems++; console.log("  ✗ " + msg); };

  // 1. Duplicate records (same source+externalId) — should be prevented by the
  //    unique constraint.
  const recs = await prisma.record.findMany({ select: { id: true, source: true, externalId: true, signalsB64: true } });
  const key = new Set<string>();
  for (const r of recs) {
    const k = `${r.source}:${r.externalId}`;
    if (key.has(k)) flag(`duplicate record key ${k}`);
    key.add(k);
  }
  console.log(`Records: ${recs.length} (${new Set(recs.map((r) => r.source)).size} sources)`);

  // 2. Identical waveforms across records (byte-identical signals).
  const sigHash = new Map<number, string>();
  let sigDupes = 0;
  for (const r of recs) {
    const h = hashStr(r.signalsB64);
    if (sigHash.has(h)) sigDupes++;
    else sigHash.set(h, r.id);
  }
  if (sigDupes > 0) flag(`${sigDupes} records share an identical waveform`);
  else console.log("  ✓ no identical waveforms across records");

  // 3. Question integrity: one-per-(record,kind); well-formed options; explanation.
  const qs = await prisma.question.findMany({
    select: { id: true, typeId: true, recordId: true, kind: true, options: true, correctOptionId: true, explanation: true, authored: true, reviewStatus: true },
  });
  const recKind = new Set<string>();
  let badOptions = 0, thinExpl = 0, noWhyNot = 0, dupRecKind = 0;
  for (const q of qs) {
    if (q.recordId) {
      const rk = `${q.recordId}:${q.kind}`;
      if (recKind.has(rk)) dupRecKind++;
      recKind.add(rk);
    }
    const opts = JSON.parse(q.options) as { id: string; label: string }[];
    const labels = opts.map((o) => o.label);
    const correct = opts.find((o) => o.id === q.correctOptionId);
    if (!correct || opts.length < 3 || new Set(labels).size !== labels.length) badOptions++;
    if (!q.explanation || q.explanation.length < 40) thinExpl++;
    // MCQ explanations should address the distractors (why-not) — heuristic.
    const addressesDistractors = /why not|instead|not present|are not|other option|rather than|distinguishes|contrast/i.test(q.explanation);
    if (!addressesDistractors) noWhyNot++;
  }
  if (dupRecKind > 0) flag(`${dupRecKind} duplicate (record, kind) questions`);
  else console.log("  ✓ no duplicate (record, kind) questions");
  if (badOptions > 0) flag(`${badOptions} questions with malformed options`);
  else console.log("  ✓ all questions have well-formed, distinct options + a valid correct answer");
  if (thinExpl > 0) flag(`${thinExpl} questions with a thin/empty explanation`);
  else console.log("  ✓ every question has a substantive explanation");
  console.log(`  · ${noWhyNot}/${qs.length} explanations don't obviously address distractors (heuristic)`);

  // 4. Review-status gate: authored/pending held out of the live bank.
  const byStatus = await prisma.question.groupBy({ by: ["reviewStatus"], _count: true });
  console.log("Review status: " + byStatus.map((s) => `${s.reviewStatus}=${s._count}`).join("  "));
  const pendingApproved = qs.filter((q) => q.authored && q.reviewStatus === "approved").length;
  if (pendingApproved > 0) flag(`${pendingApproved} authored questions are marked approved (should be pending)`);
  else console.log("  ✓ all authored questions are held pending clinician sign-off");

  console.log(problems === 0 ? "\n✔ Audit passed — no problems." : `\n✗ Audit found ${problems} problem group(s).`);
  await prisma.$disconnect();
  if (problems > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
