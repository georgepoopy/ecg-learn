/** DEV ONLY: delete all users (and, by cascade, their progress). Content stays. */
import { makePrisma } from "./db";

async function main() {
  const prisma = makePrisma();
  const { count } = await prisma.user.deleteMany();
  console.log(`✔ Deleted ${count} users (content preserved).`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
