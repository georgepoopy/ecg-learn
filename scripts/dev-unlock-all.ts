/** DEV ONLY: unlock every type for the local user (to exercise practice). */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  await prisma.user.upsert({ where: { id: "local" }, update: {}, create: { id: "local" } });
  const now = new Date();
  const types = await prisma.ecgType.findMany({ select: { id: true } });
  for (const t of types) {
    await prisma.typeProgress.upsert({
      where: { userId_typeId: { userId: "local", typeId: t.id } },
      update: { unlocked: true, unlockedAt: now },
      create: { userId: "local", typeId: t.id, unlocked: true, unlockedAt: now },
    });
    const qs = await prisma.question.findMany({ where: { typeId: t.id }, select: { id: true } });
    for (const q of qs) {
      await prisma.questionState.upsert({
        where: { userId_questionId: { userId: "local", questionId: q.id } },
        update: {},
        create: { userId: "local", questionId: q.id, dueAt: now },
      });
    }
  }
  console.log(`✔ Unlocked ${types.length} types.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
