import Link from "next/link";
import { fetchNextQuestion } from "@/app/actions";
import { getCurriculum } from "@/lib/queries";
import Quiz from "@/components/Quiz";

export const dynamic = "force-dynamic";

/**
 * Guided review is ALWAYS blind and interleaved — it never restricts to a single
 * type and never names the diagnosis, so the screen can't give the answer away.
 * (Deliberate single-type / filtered drilling lives on /free, where you choose.)
 */
export default async function PracticePage() {
  const curriculum = await getCurriculum();
  const anyUnlocked = curriculum.some((t) => t.unlocked);
  const initial = anyUnlocked ? await fetchNextQuestion({}) : null;

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-clinical-700 dark:text-clinical-200">Review</h1>
        <Link href="/free" className="text-xs text-slate-400 hover:text-clinical-600">
          Free practice →
        </Link>
      </div>
      <p className="mb-5 text-xs text-slate-400">
        Mixed across everything you&apos;ve learned — the tracing isn&apos;t labelled, so
        you have to read it. Due items and weak spots come up first; ones you&apos;ve
        missed before resurface.
      </p>
      <Quiz initial={initial} mode="review" />
    </div>
  );
}
