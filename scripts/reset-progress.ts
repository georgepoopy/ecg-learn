/** Clear per-user progress (attempts, review states, unlocks) but keep content. */
import { makePrisma } from "./db";

async function main() {
  const prisma = makePrisma();
  await prisma.attempt.deleteMany();
  await prisma.questionState.deleteMany();
  await prisma.typeProgress.deleteMany();
  console.log("✔ Progress reset (content preserved).");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
