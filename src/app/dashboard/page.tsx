import Link from "next/link";
import { getDashboard } from "@/lib/queries";
import AnimatedBar from "@/components/AnimatedBar";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  sub,
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delay?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-card transition-shadow hover:shadow-lift motion-safe:animate-fade-slide-up dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="text-2xl font-semibold tabular-nums text-clinical-700 dark:text-clinical-200">
        {value}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const { types, totals } = await getDashboard();
  const overallAcc = totals.totalAttempts
    ? Math.round((totals.correctAttempts / totals.totalAttempts) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-clinical-700 dark:text-clinical-200">Progress</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Types unlocked" value={`${totals.unlockedTypes}/${totals.totalTypes}`} delay={0} />
        <Stat label="Mastered" value={totals.masteredTypes} delay={60} />
        <Stat label="Due now" value={totals.dueNow} sub="cards to review" delay={120} />
        <Stat label="Accuracy" value={`${overallAcc}%`} sub={`${totals.totalAttempts} attempts`} delay={180} />
      </div>

      {totals.dueNow > 0 && (
        <Link
          href="/practice"
          className="mt-5 inline-block rounded-md bg-clinical-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-clinical-700"
        >
          Review {totals.dueNow} due →
        </Link>
      )}

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400">
        By type
      </h2>
      <div className="mt-3 space-y-2">
        {types.map((t) => {
          const acc = t.seenCount ? Math.round((t.correctCount / t.seenCount) * 100) : null;
          return (
            <div
              key={t.id}
              className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-card transition-shadow hover:shadow-lift dark:border-slate-800 dark:bg-slate-900/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-clinical-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-clinical-700 dark:bg-clinical-900 dark:text-clinical-200">
                    {t.shortName}
                  </span>
                  <span className="text-sm font-medium">{t.name}</span>
                  {t.mastered && <span className="text-xs text-amber-500">★</span>}
                </div>
                <div className="text-xs text-slate-400">
                  {t.unlocked ? (
                    <>
                      {Math.round(t.masteryScore * 100)}% mastery
                      {acc != null && ` · ${acc}% acc`}
                      {t.dueCount > 0 && ` · ${t.dueCount} due`}
                    </>
                  ) : (
                    <span className="opacity-70">Locked</span>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <AnimatedBar
                  value={t.masteryScore}
                  barClassName={t.mastered ? "bg-amber-400" : "bg-clinical-500"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
