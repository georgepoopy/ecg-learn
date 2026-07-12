import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const types = await prisma.ecgType.findMany({
    orderBy: { order: "asc" },
    include: {
      lesson: true,
      _count: { select: { questions: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-clinical-700 dark:text-clinical-200">
        ECG Learn
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Study one ECG type at a time. Completing a lesson unlocks that type and
        adds its questions to your practice bank. (Phase 1 preview: curriculum
        seeded from PTB-XL.)
      </p>

      <a
        href="/preview"
        className="mt-4 inline-block rounded-md bg-clinical-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-clinical-700"
      >
        View waveform renderer →
      </a>

      <ul className="mt-8 space-y-3">
        {types.map((t) => (
          <li
            key={t.id}
            className="rounded-lg border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="inline-block rounded bg-clinical-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-clinical-700 dark:bg-clinical-900 dark:text-clinical-200">
                  {t.shortName}
                </span>
                <h2 className="mt-1 font-medium">{t.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.summary}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-400">
                <div>{t._count.questions} questions</div>
                <div>~{t.lesson?.estMinutes ?? 5} min lesson</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
