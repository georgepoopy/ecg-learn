import Link from "next/link";
import { getCurriculum, type CurriculumItem } from "@/lib/queries";
import { groupByCategory } from "@/lib/categories";
import AnimatedBar from "@/components/AnimatedBar";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { dot: string; ring: string; chip: string }> = {
  mastered: {
    dot: "bg-amber-400",
    ring: "border-amber-300 dark:border-amber-700",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  learning: {
    dot: "bg-emerald-500",
    ring: "border-emerald-300 dark:border-emerald-700",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  available: {
    dot: "bg-clinical-600",
    ring: "border-clinical-400 dark:border-clinical-600",
    chip: "bg-clinical-100 text-clinical-700 dark:bg-clinical-900 dark:text-clinical-200",
  },
  locked: {
    dot: "bg-slate-300 dark:bg-slate-700",
    ring: "border-slate-200 dark:border-slate-800",
    chip: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
};

function Node({ t, isNext }: { t: CurriculumItem; isNext: boolean }) {
  const s = STATUS[t.status];
  const href = t.unlocked ? `/practice?type=${t.id}` : `/learn/${t.id}`;
  return (
    <Link
      href={href}
      title={`${t.name} — ${t.status}${t.status === "locked" ? ` (after ${t.prereqName})` : ""}`}
      className={
        "group relative flex w-40 shrink-0 flex-col rounded-lg border bg-white/70 p-2.5 shadow-card transition-shadow hover:shadow-lift dark:bg-slate-900/40 " +
        s.ring +
        (isNext ? " ring-2 ring-clinical-400 ring-offset-1 dark:ring-offset-slate-950" : "")
      }
    >
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          <span className={"h-2 w-2 rounded-full " + s.dot} />
          {t.shortName}
        </span>
        {t.status === "mastered" && <span className="text-amber-500">★</span>}
        {t.status === "locked" && <span className="text-slate-400">{t.pendingReview ? "⏳" : "🔒"}</span>}
        {t.dueCount > 0 && (
          <span className="rounded bg-rose-100 px-1 text-[9px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            {t.dueCount}
          </span>
        )}
      </div>
      <span className="mt-1 line-clamp-2 text-xs leading-tight text-slate-700 dark:text-slate-200">
        {t.name}
      </span>
      {t.unlocked ? (
        <div className="mt-1.5">
          <AnimatedBar value={t.masteryScore} height="h-1" barClassName={t.mastered ? "bg-amber-400" : "bg-clinical-500"} />
        </div>
      ) : (
        <span className={"mt-1.5 w-fit rounded px-1.5 py-0.5 text-[9px] font-medium " + s.chip}>
          {t.pendingReview ? "Pending review" : t.status === "locked" ? "Jump ahead" : isNext ? "Start here" : "Learn"}
        </span>
      )}
    </Link>
  );
}

function ActionCard({ href, title, sub, accent = false }: { href: string; title: string; sub: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={
        "flex-1 rounded-xl border p-4 shadow-card transition-shadow hover:shadow-lift " +
        (accent ? "border-clinical-500 bg-clinical-600 text-white" : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/40")
      }
    >
      <div className={"text-sm font-semibold " + (accent ? "" : "text-clinical-700 dark:text-clinical-200")}>{title}</div>
      <div className={"mt-0.5 text-xs " + (accent ? "text-clinical-50" : "text-slate-500 dark:text-slate-400")}>{sub}</div>
    </Link>
  );
}

export default async function Home() {
  const items = await getCurriculum();
  const totalDue = items.reduce((n, t) => n + t.dueCount, 0);
  const mastered = items.filter((t) => t.mastered).length;
  const learned = items.filter((t) => t.unlocked).length;
  const tree = groupByCategory(items);

  // "Continue" target: a learning type with due cards, else the next available.
  const nextItem =
    items.find((t) => t.status === "learning" && t.dueCount > 0) ??
    items.find((t) => t.status === "available") ??
    items.find((t) => t.status === "learning");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-clinical-700 dark:text-clinical-200">Progression map</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
        Work through the categories in order — each type you master unlocks the next, and everything you&apos;ve
        learned keeps resurfacing in interleaved review. Prefer self-paced? Jump ahead to any type.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {learned} learned · {mastered} mastered · {items.length} types
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {nextItem && (
          <ActionCard
            href={nextItem.unlocked ? `/practice?type=${nextItem.id}` : `/learn/${nextItem.id}`}
            title={nextItem.unlocked ? "Continue" : "Start next"}
            sub={nextItem.name}
            accent
          />
        )}
        {totalDue > 0 && <ActionCard href="/practice" title={`Review ${totalDue} due`} sub="Interleaved across all you've learned" />}
        <ActionCard href="/free" title="Free practice" sub="Self-paced — pick any category, level, or type" />
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
        {[["available", "Next up"], ["learning", "Learning"], ["mastered", "Mastered"], ["locked", "Locked"]].map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={"h-2.5 w-2.5 rounded-full " + STATUS[k].dot} />
            {label}
          </span>
        ))}
      </div>

      {/* The map */}
      <div className="mt-8 space-y-8">
        {tree.map((cat) => {
          const catItems = cat.subs.flatMap((s) => s.items);
          const catMastered = catItems.filter((t) => t.mastered).length;
          return (
            <section key={cat.id} className="rounded-xl border border-slate-200 bg-white/40 p-4 dark:border-slate-800 dark:bg-slate-900/20">
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-clinical-700 dark:text-clinical-200">{cat.label}</h2>
                  <p className="text-xs text-slate-400">{cat.blurb}</p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {catMastered}/{catItems.length} mastered
                </span>
              </div>
              <div className="space-y-3">
                {cat.subs.map((sub) => (
                  <div key={sub.id}>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{sub.label}</div>
                    <div className="flex flex-wrap items-stretch gap-2">
                      {sub.items.map((t, i) => (
                        <div key={t.id} className="flex items-stretch gap-2">
                          {i > 0 && <span className="self-center text-slate-300 dark:text-slate-700">›</span>}
                          <Node t={t} isNext={nextItem?.id === t.id} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
