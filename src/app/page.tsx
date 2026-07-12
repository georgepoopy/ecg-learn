import Link from "next/link";
import { getCurriculum } from "@/lib/queries";
import AnimatedBar from "@/components/AnimatedBar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await getCurriculum();
  const totalDue = items.reduce((n, t) => n + t.dueCount, 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-clinical-700 dark:text-clinical-200">
            Curriculum
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Study one ECG type at a time. Completing a lesson unlocks that type
            and adds its questions to your practice bank. Lessons open in order.
          </p>
        </div>
        {totalDue > 0 && (
          <Link
            href="/practice"
            className="shrink-0 rounded-md bg-clinical-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-clinical-700"
          >
            Review {totalDue} due →
          </Link>
        )}
      </div>

      <ol className="mt-8 space-y-3">
        {items.map((t, idx) => {
          const locked = !t.available && !t.unlocked;
          return (
            <li
              key={t.id}
              style={{ animationDelay: `${idx * 60}ms` }}
              className={
                "rounded-lg border p-4 shadow-card motion-safe:animate-fade-slide-up " +
                (locked
                  ? "border-slate-200 bg-slate-50/60 opacity-70 dark:border-slate-800 dark:bg-slate-900/30"
                  : "border-slate-200 bg-white/70 transition-shadow hover:shadow-lift dark:border-slate-800 dark:bg-slate-900/40")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded bg-clinical-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-clinical-700 dark:bg-clinical-900 dark:text-clinical-200">
                      {t.shortName}
                    </span>
                    {t.unlocked && !t.mastered && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Unlocked
                      </span>
                    )}
                    {t.mastered && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        ★ Mastered
                      </span>
                    )}
                    {locked && (
                      <span className="text-[10px] text-slate-400">🔒 Complete previous lesson</span>
                    )}
                    {t.dueCount > 0 && (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {t.dueCount} due
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1.5 font-medium">{t.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.summary}</p>
                  {t.unlocked && (
                    <div className="mt-2 max-w-xs">
                      <AnimatedBar
                        value={t.masteryScore}
                        barClassName={t.mastered ? "bg-amber-400" : "bg-clinical-500"}
                      />
                      <span className="mt-1 block text-[10px] text-slate-400">
                        Mastery {Math.round(t.masteryScore * 100)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-400">
                    {t.questionCount} questions · ~{t.estMinutes} min
                  </div>
                  <div className="mt-2">
                    {locked ? (
                      <span className="cursor-not-allowed text-xs text-slate-400">Locked</span>
                    ) : (
                      <Link
                        href={`/learn/${t.id}`}
                        className="inline-block rounded-md bg-clinical-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-clinical-700"
                      >
                        {t.unlocked ? "Review lesson" : "Study lesson"}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 text-center">
        <Link href="/preview" className="text-xs text-slate-400 underline hover:text-slate-600">
          Waveform renderer preview
        </Link>
      </div>
    </div>
  );
}
