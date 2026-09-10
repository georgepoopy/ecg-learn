import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson } from "@/lib/queries";
import EcgViewer from "@/components/EcgViewer";
import LessonUnlock from "@/components/LessonUnlock";
import { sourceLabel } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  const { typeId } = await params;
  const lesson = await getLesson(typeId);
  if (!lesson) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
        ← {lesson.categoryLabel} · {lesson.subLabel}
      </Link>

      {lesson.status === "locked" && !lesson.unlocked && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          You&apos;re jumping ahead — the guided path suggests mastering{" "}
          <strong>{lesson.prereqName}</strong> first. You can still learn this now.
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className="rounded bg-clinical-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-clinical-700 dark:bg-clinical-900 dark:text-clinical-200">
          {lesson.shortName}
        </span>
        <span className="text-xs text-slate-400">~{lesson.estMinutes} min lesson</span>
      </div>
      <h1 className="mt-1 text-2xl font-semibold text-clinical-700 dark:text-clinical-200">
        {lesson.name}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{lesson.summary}</p>

      {/* Worked examples — a few labelled tracings to study. In practice you'll
          see these unlabelled and mixed with other rhythms. */}
      {lesson.examples.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {lesson.examples.length > 1 ? "Worked examples" : "Example tracing"}
            <span className="ml-2 font-normal normal-case text-slate-400">
              — study these; in practice they&apos;re unlabelled
            </span>
          </h3>
          <div className="space-y-4">
            {lesson.examples.map((ex, i) => (
              <EcgViewer
                key={ex.externalId + i}
                signalsB64={ex.signalsB64}
                leadOrder={ex.leadOrder}
                gain={ex.gain}
                fs={ex.fs}
                nSamples={ex.nSamples}
                defaultHighlight={ex.leadFocus}
                caption={`${lesson.name} — real tracing (${sourceLabel(ex.source)} ${ex.externalId}).`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lesson body */}
      <div className="mt-8 space-y-6">
        {lesson.sections.map((s, i) => (
          <section
            key={i}
            style={{ animationDelay: `${i * 80}ms` }}
            className="border-l-2 border-clinical-200 pl-4 motion-safe:animate-fade-slide-up dark:border-clinical-800"
          >
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{s.heading}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {s.body}
            </p>
          </section>
        ))}
      </div>

      {/* Key facts */}
      <div className="mt-8 rounded-lg border border-clinical-200 bg-clinical-50 p-4 dark:border-clinical-800 dark:bg-clinical-900/30">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-clinical-700 dark:text-clinical-300">
          Recognise it by
        </h3>
        <ul className="mt-2 space-y-1">
          {lesson.keyFacts.map((f, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-200">
              <span className="text-clinical-500">•</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
        {lesson.pendingReview ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-semibold">Awaiting clinician sign-off</p>
            <p className="mt-1 opacity-90">
              This topic&apos;s questions are <strong>originally authored</strong> and
              are held out of the live practice bank until a clinician verifies them
              (see REVIEW.md). You can read the lesson above; practice questions will
              appear here once approved.
            </p>
          </div>
        ) : (
          <LessonUnlock
            typeId={lesson.id}
            unlocked={lesson.unlocked}
            questionCount={lesson.questionCount}
          />
        )}
      </div>
    </div>
  );
}
