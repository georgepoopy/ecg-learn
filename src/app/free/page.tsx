import Link from "next/link";
import { fetchNextQuestion } from "@/app/actions";
import { getCurriculum } from "@/lib/queries";
import { CATEGORY_TREE } from "@/lib/categories";
import Quiz from "@/components/Quiz";

export const dynamic = "force-dynamic";

const TIERS = ["foundational", "intermediate", "advanced", "expert"];
const KINDS = [
  ["identify", "Identify"],
  ["which-finding", "Which finding"],
  ["rate", "Rate"],
  ["axis", "Axis"],
  ["territory", "Territory"],
  ["lead", "Lead"],
  ["criteria", "Concept"],
];

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "bg-clinical-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")
      }
    >
      {children}
    </Link>
  );
}

export default async function FreePracticePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; kind?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const tier = TIERS.includes(sp.tier ?? "") ? sp.tier : undefined;
  const kind = KINDS.some((k) => k[0] === sp.kind) ? sp.kind : undefined;
  const cat = CATEGORY_TREE.some((c) => c.id === sp.cat) ? sp.cat : undefined;

  const curriculum = await getCurriculum();
  const anyUnlocked = curriculum.some((t) => t.unlocked);

  // Category filter → the category's type ids (intersected with unlocked in the action).
  const category = cat ? CATEGORY_TREE.find((c) => c.id === cat) : undefined;
  const typeIds = category ? category.subs.flatMap((s) => s.typeIds) : undefined;

  const initial = anyUnlocked
    ? await fetchNextQuestion({ mode: "free", tier, kind, typeIds })
    : null;

  const qs = (next: { tier?: string | null; kind?: string | null; cat?: string | null }) => {
    const p = new URLSearchParams();
    const t = next.tier === undefined ? tier : next.tier;
    const k = next.kind === undefined ? kind : next.kind;
    const c = next.cat === undefined ? cat : next.cat;
    if (t) p.set("tier", t);
    if (k) p.set("kind", k);
    if (c) p.set("cat", c);
    const s = p.toString();
    return s ? `/free?${s}` : "/free";
  };

  if (!anyUnlocked) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-clinical-700 dark:text-clinical-200">Nothing to practise yet</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Learn a type from the map to add its questions to your bank, then drill here at your own pace.
        </p>
        <Link href="/" className="mt-5 inline-block rounded-md bg-clinical-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-clinical-700">
          Open the progression map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-clinical-700 dark:text-clinical-200">Free practice</h1>
        <Link href="/practice" className="text-xs text-slate-400 hover:text-clinical-600">Due review →</Link>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Self-paced — jump to any category, level, or question type. No due dates; weak items surface first.
      </p>

      {/* Filters */}
      <div className="mb-5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] uppercase tracking-wide text-slate-400">Category</span>
          <Chip href={qs({ cat: null })} active={!cat}>All</Chip>
          {CATEGORY_TREE.map((c) => (
            <Chip key={c.id} href={qs({ cat: c.id })} active={cat === c.id}>{c.label}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] uppercase tracking-wide text-slate-400">Level</span>
          <Chip href={qs({ tier: null })} active={!tier}>All</Chip>
          {TIERS.map((t) => (
            <Chip key={t} href={qs({ tier: t })} active={tier === t}>{t}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] uppercase tracking-wide text-slate-400">Question</span>
          <Chip href={qs({ kind: null })} active={!kind}>All</Chip>
          {KINDS.map(([k, label]) => (
            <Chip key={k} href={qs({ kind: k })} active={kind === k}>{label}</Chip>
          ))}
        </div>
      </div>

      {initial ? (
        <Quiz
          key={`${cat ?? "all"}-${tier ?? "all"}-${kind ?? "all"}`}
          initial={initial}
          mode="free"
          tier={tier}
          kind={kind}
          typeIds={typeIds}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
          No questions match these filters in your unlocked bank. Try different filters, or learn more from the map.
          {category && (
            <>
              {" "}Nothing from <strong>{category.label}</strong> is unlocked yet —{" "}
              <Link href={`/learn/${category.subs[0].typeIds[0]}`} className="text-clinical-600 underline">jump ahead</Link>.
            </>
          )}
        </p>
      )}
    </div>
  );
}
