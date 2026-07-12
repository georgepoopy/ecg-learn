/** Quick post-ingest sanity check: counts + decode one waveform. */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const types = await prisma.ecgType.findMany({
    include: { _count: { select: { questions: true } }, lesson: true },
    orderBy: { order: "asc" },
  });
  console.log("Types & question counts:");
  for (const t of types) {
    console.log(
      `  ${t.shortName.padEnd(7)} ${t.name.padEnd(42)} q=${t._count.questions}  lesson=${t.lesson ? "yes" : "NO"}`,
    );
  }

  const rec = await prisma.record.findFirst({ orderBy: { ecgId: "asc" } });
  if (!rec) throw new Error("no records");
  const leads: string[] = JSON.parse(rec.leads);
  const buf = Buffer.from(rec.signalsB64, "base64");
  const nSig = leads.length;
  const samples = buf.length / 2 / nSig;
  // Decode lead II (index 1) to mV and report basic stats.
  const leadIdx = Math.max(0, leads.indexOf("II"));
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < samples; i++) {
    const raw = buf.readInt16LE((i * nSig + leadIdx) * 2);
    const mv = raw / rec.gain;
    if (mv < min) min = mv;
    if (mv > max) max = mv;
  }
  console.log(`\nRecord ${rec.id}: fs=${rec.fs}Hz leads=${nSig} samples=${samples} gain=${rec.gain}`);
  console.log(`  lead ${leads[leadIdx]} range: ${min.toFixed(3)}..${max.toFixed(3)} mV (peak-peak ${(max - min).toFixed(3)} mV)`);
  console.log(`  expected: physiological ECG amplitudes are roughly -1..+2 mV`);

  const totalQ = await prisma.question.count();
  const totalR = await prisma.record.count();
  console.log(`\nTotals: ${totalR} records, ${totalQ} questions.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
