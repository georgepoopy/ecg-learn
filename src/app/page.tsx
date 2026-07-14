import Link from "next/link";
import { getCurriculum, type CurriculumItem } from "@/lib/queries";
import { groupByModule } from "@/lib/modules";
import AnimatedBar from "@/components/AnimatedBar";

export const dynamic = "force-dynamic";

const TIER_STYLE: Record<string, string> = {
  foundational: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  intermediate: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  advanced: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  expert: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

function ActionCard({
  href, title, sub, accent = false,
}: { href: string; title: string; sub: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={
        "flex-1 rounded-xl border p-4 shadow-card transition-shadow hover:shadow-lift " +
        (accent
          ? "border-clinical-500 bg-clinical-600 text-white"
          : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/40")
      }
    >
      <div className={"text-sm font-semibold " + (accent ? "" : "text-clinical-700 dark:text-clinical-200")}>
        {title}
      </div>
      <div className={"mt-0.5 text-xs " + (accent ? "text-clinical-50" : "text-slate-500 dark:text-slate-400")}>
        {sub}
      </div>
    </Link>
  );
}

function TypeCard({ t, idx, suggested }: { t: CurriculumItem; idx: number; suggested: boolean }) {
  return (
    <li
      style={{ animationDelay: `${idx * 30}ms` }}
      className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-card transition-shadow hover:shadow-lift motion-safe:animate-fade-slide-up dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded bg-clinical-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-clinical-700 dark:bg-clinical-900 dark:text-clinical-200">
              {t.shortName}
            </span>
            <span className={"rounded px-1.5 py-0.5 text-[10px] font-medium " + (TIER_STYLE[t.tier] ?? "")}>
              {t.tier}
            </span>
            {t.unlocked && !t.mastered && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Learned
              </span>
            )}
            {t.mastered && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                ★ Mastered
              </span>
            )}
            {suggested && t.status === "available" && (
              <span className="rounded bg-clinical-100 px-1.5 py-0.5 text-[10px] font-medium text-clinical-700 dark:bg-clinical-900 dark:text-clinical-200">
                Suggested next
              </span>
            )}
            {t.status === "locked" && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                🔒 after {t.prereqName}
              </span>
            )}
            {t.dueCount > 0 && (
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {t.dueCount} due
              </span>
            )}
          </div>
          <h3 className="mt-1.5 font-medium">{t.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.summary}</p>
          {t.unlocked && (
            <div className="mt-2 max-w-xs">
              <AnimatedBar value={t.masteryScore} barClassName={t.mastered ? "bg-amber-400" : "bg-clinical-500"} />
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
          <div className="mt-2 flex flex-col items-end gap-1">
            <Link
              href={`/learn/${t.id}`}
              className={
                "inline-block rounded-md px-3 py-1.5 text-xs font-medium " +
                (t.status === "locked"
                  ? "border border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  : "bg-clinical-600 text-white hover:bg-clinical-700")
              }
            >
              {t.unlocked ? "Review lesson" : t.status === "locked" ? "Jump ahead" : "Learn"}
            </Link>
            {t.unlocked && (
              <Link
                href={`/practice?type=${t.id}`}
                className="text-[11px] text-slate-400 hover:text-clinical-600"
              >
                Practice →
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default async function Home() {
  const items = await getCurriculum();
  const totalDue = items.reduce((n, t) => n + t.dueCount, 0);
  const unlockedCount = items.filter((t) => t.unlocked).length;
  const modules = groupByModule(items);
  const nextCourse = items.find((t) => !t.unlocked && t.available) ?? items.find((t) => !t.unlocked);

  let idx = 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-clinical-700 dark:text-clinical-200">
        ECG Learn
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
        Learn ECG types at your own pace. Each type you learn joins your personal
        bank permanently, and review interleaves everything you&apos;ve learned so
        far — weighted toward what&apos;s due and what needs work.
      </p>
      <p className="mt-1 text-xs text-slate-400">{unlockedCount} of {items.length} types learned</p>

      {/* Primary actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <ActionCard
          href="/practice"
          title={totalDue > 0 ? `Review ${totalDue} due` : "Review"}
          sub="Interleaved across all you've learned"
          accent={totalDue > 0}
        />
        <ActionCard href="/free" title="Free practice" sub="Self-paced, filter by level or type" />
        {nextCourse && (
          <ActionCard
            href={`/learn/${nextCourse.id}`}
            title="Continue course"
            sub={`Next: ${nextCourse.name}`}
          />
        )}
      </div>

      {/* Library */}
      <h2 className="mt-10 mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Library</h2>
      <p className="mb-4 text-xs text-slate-400">
        Learn any type in any order. The guided course suggests a sequence, but
        it&apos;s only a suggestion.
      </p>
      <div className="space-y-8">
        {modules.map((m) => {
          const done = m.items.filter((t) => t.unlocked).length;
          return (
            <section key={m.superclass}>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{m.label}</h3>
                <span className="text-[10px] text-slate-400">{done}/{m.items.length}</span>
              </div>
              <ol className="space-y-3">
                {m.items.map((t) => (
                  <TypeCard key={t.id} t={t} idx={idx++} suggested={nextCourse?.id === t.id} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <Link href="/preview" className="text-xs text-slate-400 underline hover:text-slate-600">
          Waveform renderer preview
        </Link>
      </div>
    </div>
  );
}
