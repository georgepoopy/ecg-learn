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

const TIER_COLOR: Record<string, string> = {
  foundational: "bg-emerald-500",
  intermediate: "bg-sky-500",
  advanced: "bg-amber-500",
  expert: "bg-rose-500",
};

export default async function DashboardPage() {
  const { types, totals, tierStats, weakAreas, strongAreas } = await getDashboard();
  const overallAcc = totals.totalAttempts
    ? Math.round((totals.correctAttempts / totals.totalAttempts) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-clinical-700 dark:text-clinical-200">Progress</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Types learned" value={`${totals.unlockedTypes}/${totals.totalTypes}`} delay={0} />
        <Stat label="Bank size" value={totals.bankSize} sub="questions unlocked" delay={60} />
        <Stat label="Due now" value={totals.dueNow} sub="cards to review" delay={120} />
        <Stat
          label="Predicted recall"
          value={`${Math.round(totals.avgRetention * 100)}%`}
          sub="FSRS, reviewed cards"
          delay={180}
        />
      </div>

      {totals.dueNow > 0 && (
        <Link
          href="/practice"
          className="mt-5 inline-block rounded-md bg-clinical-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-clinical-700"
        >
          Review {totals.dueNow} due →
        </Link>
      )}

      {/* Strengths & weak areas */}
      {(weakAreas.length > 0 || strongAreas.length > 0) && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900 dark:bg-rose-950/20">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">
              Focus here (weakest)
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {weakAreas.length ? weakAreas.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <Link href={`/practice?type=${t.id}`} className="hover:text-clinical-600">{t.name}</Link>
                  <span className="text-xs text-slate-400">{Math.round(t.masteryScore * 100)}%</span>
                </li>
              )) : <li className="text-xs text-slate-400">Answer some questions to see this.</li>}
            </ul>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Strengths
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {strongAreas.length ? strongAreas.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span>{t.name}</span>
                  <span className="text-xs text-slate-400">{Math.round(t.masteryScore * 100)}%</span>
                </li>
              )) : <li className="text-xs text-slate-400">Answer some questions to see this.</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Accuracy by difficulty tier */}
      {tierStats.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Accuracy by difficulty
          </h2>
          <div className="mt-3 space-y-2">
            {tierStats.map((s) => (
              <div key={s.tier} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs capitalize text-slate-500 dark:text-slate-400">
                  {s.tier}
                </span>
                <AnimatedBar value={s.accuracy} barClassName={TIER_COLOR[s.tier] ?? "bg-clinical-500"} />
                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-400">
                  {Math.round(s.accuracy * 100)}% · {s.attempts}
                </span>
              </div>
            ))}
          </div>
        </>
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
                    <span className="opacity-70">Not learned</span>
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
