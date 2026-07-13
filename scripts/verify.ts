/** Post-ingest sanity check: counts, kind/tier distribution, sample questions. */
import { makePrisma } from "./db";

async function main() {
  const prisma = makePrisma();

  const totalQ = await prisma.question.count();
  const totalR = await prisma.record.count();
  const totalT = await prisma.ecgType.count();
  console.log(`Types: ${totalT}  Records: ${totalR}  Questions: ${totalQ}\n`);

  const byKind = await prisma.question.groupBy({ by: ["kind"], _count: true });
  console.log("By kind:  " + byKind.map((k) => `${k.kind}=${k._count}`).join("  "));
  const byTier = await prisma.question.groupBy({ by: ["tier"], _count: true });
  console.log("By tier:  " + byTier.map((k) => `${k.tier}=${k._count}`).join("  "));

  console.log("\n── Sample question per kind ──");
  for (const kind of ["identify", "which-finding", "rate", "axis", "territory", "lead"]) {
    const q = await prisma.question.findFirst({ where: { kind }, include: { type: true } });
    if (!q) continue;
    const opts = JSON.parse(q.options) as { id: string; label: string }[];
    const correct = opts.find((o) => o.id === q.correctOptionId)!.label;
    console.log(`\n[${kind}] (${q.tier}, type=${q.type.shortName})`);
    console.log(`  Q: ${q.stem}`);
    console.log(`  options: ${opts.map((o) => o.label).join(" | ")}`);
    console.log(`  ✓ ${correct}`);
    console.log(`  explanation: ${q.explanation}`);
  }

  // Validate rate-question answers against any rate label on the record.
  console.log("\n── Rate-question consistency check ──");
  const rates = await prisma.question.findMany({
    where: { kind: "rate" },
    include: { record: true },
    take: 400,
  });
  let checked = 0;
  let bad = 0;
  for (const q of rates) {
    if (!q.record) continue;
    const labels: string[] = JSON.parse(q.labels);
    const opts = JSON.parse(q.options) as { id: string; label: string }[];
    const bpm = parseInt(opts.find((o) => o.id === q.correctOptionId)!.label, 10);
    checked++;
    if (labels.includes("SBRAD") && bpm >= 65) bad++;
    if (labels.includes("STACH") && bpm <= 95) bad++;
  }
  console.log(`  ${checked} rate questions checked, ${bad} inconsistent with brady/tachy labels.`);

  // Decode one downsampled record.
  const rec = await prisma.record.findFirst();
  if (rec) {
    const leads: string[] = JSON.parse(rec.leads);
    const buf = Buffer.from(rec.signalsB64, "base64");
    const samples = buf.length / 2 / leads.length;
    console.log(`\nRecord ${rec.id}: fs=${rec.fs}Hz samples=${samples} leads=${leads.length} (expect fs=250, samples=2500)`);
  }

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
