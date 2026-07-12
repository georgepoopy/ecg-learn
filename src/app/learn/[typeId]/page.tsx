import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson } from "@/lib/queries";
import EcgViewer from "@/components/EcgViewer";
import LessonUnlock from "@/components/LessonUnlock";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  const { typeId } = await params;
  const lesson = await getLesson(typeId);
  if (!lesson) notFound();

  if (!lesson.available && !lesson.unlocked) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-lg font-semibold">{lesson.name} is locked</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Complete the previous lesson to unlock this one.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-md bg-clinical-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-clinical-700"
        >
          Back to curriculum
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
        ← Curriculum
      </Link>

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

      {/* Sample tracing */}
      {lesson.sampleRecord && (
        <div className="mt-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Example tracing
          </h3>
          <EcgViewer
            signalsB64={lesson.sampleRecord.signalsB64}
            leadOrder={lesson.sampleRecord.leadOrder}
            gain={lesson.sampleRecord.gain}
            fs={lesson.sampleRecord.fs}
            nSamples={lesson.sampleRecord.nSamples}
            defaultHighlight={lesson.sampleRecord.leadFocus}
            caption={`A real ${lesson.name} tracing (PTB-XL #${lesson.sampleRecord.ecgId}).`}
          />
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
        <LessonUnlock
          typeId={lesson.id}
          unlocked={lesson.unlocked}
          questionCount={lesson.questionCount}
        />
      </div>
    </div>
  );
}
