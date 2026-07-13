import Link from "next/link";
import { fetchNextQuestion } from "@/app/actions";
import { getCurriculum } from "@/lib/queries";
import Quiz from "@/components/Quiz";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : undefined;

  const curriculum = await getCurriculum();
  const anyUnlocked = curriculum.some((t) => t.unlocked);
  const initial = anyUnlocked
    ? await fetchNextQuestion({ preferType: type, mode: "review" })
    : null;

  if (!anyUnlocked) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-clinical-700 dark:text-clinical-200">
          Your practice bank is empty
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Complete a lesson to unlock a type and add its questions here.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-md bg-clinical-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-clinical-700"
        >
          Go to curriculum
        </Link>
      </div>
    );
  }

  const activeType = type ? curriculum.find((t) => t.id === type) : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-clinical-700 dark:text-clinical-200">
          {activeType ? `Review · ${activeType.name}` : "Review"}
        </h1>
        <div className="flex gap-3 text-xs">
          <Link href="/free" className="text-slate-400 hover:text-clinical-600">
            Free practice →
          </Link>
          {activeType && (
            <Link href="/practice" className="text-slate-400 hover:text-clinical-600">
              All types →
            </Link>
          )}
        </div>
      </div>
      <p className="mb-5 text-xs text-slate-400">
        {activeType
          ? "Due items from this type, weighted by what needs work."
          : "Interleaved across everything you've learned — due items first, weak areas weighted higher."}
      </p>
      <Quiz initial={initial} preferType={type} mode="review" />
    </div>
  );
}
