"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import EcgViewer from "./EcgViewer";
import AnimatedBar from "./AnimatedBar";
import { submitAnswer, fetchNextQuestion } from "@/app/actions";
import type { QuestionPayload, SubmitResult } from "@/lib/types";

export default function Quiz({
  initial,
  preferType,
}: {
  initial: QuestionPayload | null;
  preferType?: string;
}) {
  const [current, setCurrent] = useState<QuestionPayload | null>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [caughtUp, setCaughtUp] = useState(initial === null);
  const [stats, setStats] = useState({ answered: 0, correct: 0 });
  const shownAt = useRef<number>(Date.now());

  useEffect(() => {
    shownAt.current = Date.now();
  }, [current?.questionId]);

  const submit = useCallback(async () => {
    if (!current || selected == null || result || busy) return;
    setBusy(true);
    const res = await submitAnswer(current.questionId, selected, Date.now() - shownAt.current);
    setResult(res);
    setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (res.correct ? 1 : 0) }));
    setBusy(false);
  }, [current, selected, result, busy]);

  const next = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const q = await fetchNextQuestion(preferType, current?.questionId);
    if (!q) {
      setCaughtUp(true);
      setCurrent(null);
    } else {
      setCurrent(q);
      setSelected(null);
      setResult(null);
    }
    setBusy(false);
  }, [busy, preferType, current?.questionId]);

  // Keyboard: 1–4 pick, Enter submit/advance.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (!result && /^[1-9]$/.test(e.key)) {
        const i = parseInt(e.key, 10) - 1;
        if (i < current.options.length) {
          setSelected(current.options[i].id);
          e.preventDefault();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (result) void next();
        else void submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, result, submit, next]);

  if (caughtUp || !current) {
    const acc = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-card motion-safe:animate-fade-slide-up dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl motion-safe:animate-pop-in dark:bg-emerald-950">
          ✓
        </div>
        <h2 className="text-lg font-semibold text-clinical-700 dark:text-clinical-200">
          All caught up
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {stats.answered > 0
            ? `You reviewed ${stats.answered} card${stats.answered === 1 ? "" : "s"} this session — ${stats.correct} correct (${acc}%).`
            : "No cards are due right now. Unlock more types or come back when reviews are due."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/" className="rounded-md border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700">
            Curriculum
          </Link>
          <Link href="/dashboard" className="rounded-md bg-clinical-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-clinical-700">
            View progress
          </Link>
        </div>
      </div>
    );
  }

  const acc = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;

  return (
    <div key={current.questionId} className="space-y-4 motion-safe:animate-fade-slide-up">
      {/* Session header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="rounded bg-clinical-100 px-1.5 py-0.5 font-semibold text-clinical-700 dark:bg-clinical-900 dark:text-clinical-200">
            {current.shortName}
          </span>
          {current.ahead ? (
            <span className="text-amber-600 dark:text-amber-400">Practicing ahead</span>
          ) : (
            <span>{current.dueRemaining} due</span>
          )}
        </div>
        <div>
          Session: {stats.correct}/{stats.answered} {stats.answered > 0 && `(${acc}%)`}
        </div>
      </div>

      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{current.stem}</p>

      {current.record ? (
        <EcgViewer
          key={current.questionId}
          signalsB64={current.record.signalsB64}
          leadOrder={current.record.leadOrder}
          gain={current.record.gain}
          fs={current.record.fs}
          nSamples={current.record.nSamples}
          defaultHighlight={result ? current.leadFocus : null}
          caption={`PTB-XL record #${current.record.ecgId}`}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          Concept question — no tracing. Answer from the described criteria.
        </div>
      )}

      {/* Options */}
      <div className="grid gap-2 sm:grid-cols-2">
        {current.options.map((o, i) => {
          const isSelected = selected === o.id;
          const isCorrect = result && o.id === result.correctOptionId;
          const isWrongPick = result && isSelected && !result.correct;
          const dim = result && !isCorrect && !isWrongPick;
          let cls =
            "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm outline-none ";
          if (isCorrect)
            cls +=
              "border-emerald-400 bg-emerald-50 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/50 motion-safe:animate-pop";
          else if (isWrongPick)
            cls +=
              "border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/50 motion-safe:animate-shake";
          else if (isSelected)
            cls +=
              "border-clinical-500 bg-clinical-50 shadow-glow ring-1 ring-clinical-400 dark:border-clinical-400 dark:bg-clinical-900/40";
          else
            cls +=
              "border-slate-200 hover:border-clinical-300 hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 motion-safe:hover:-translate-y-px";
          if (dim) cls += " opacity-55";
          return (
            <button
              key={o.id}
              disabled={!!result || busy}
              onClick={() => setSelected(o.id)}
              className={cls}
            >
              <kbd
                className={
                  "grid h-6 w-6 shrink-0 place-items-center rounded border text-[11px] font-medium " +
                  (isSelected && !result
                    ? "border-clinical-400 bg-clinical-500 text-white"
                    : "border-slate-300 text-slate-500 dark:border-slate-600")
                }
              >
                {i + 1}
              </kbd>
              <span className="flex-1">{o.label}</span>
              {isCorrect && (
                <span className="inline-block text-emerald-600 motion-safe:animate-pop-in dark:text-emerald-400">
                  ✓
                </span>
              )}
              {isWrongPick && (
                <span className="inline-block text-rose-600 motion-safe:animate-pop-in dark:text-rose-400">
                  ✗
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback + actions */}
      {result ? (
        <div className="space-y-3 motion-safe:animate-fade-slide-up">
          <div
            className={
              "rounded-lg border p-4 text-sm " +
              (result.correct
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 motion-safe:animate-success-pulse dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200")
            }
          >
            <p className="flex items-center gap-1.5 font-semibold">
              <span className="motion-safe:animate-pop-in">{result.correct ? "✓" : "✗"}</span>
              {result.correct ? "Correct" : "Not quite"}
            </p>
            <p className="mt-1 opacity-90">{result.explanation}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="shrink-0 text-xs opacity-80">{current.typeName} mastery</span>
              <AnimatedBar
                value={result.typeMastery}
                className="max-w-[160px]"
                barClassName={result.correct ? "bg-emerald-500" : "bg-clinical-500"}
              />
              <span className="shrink-0 text-xs font-medium tabular-nums">
                {Math.round(result.typeMastery * 100)}%
              </span>
            </div>
          </div>
          <button
            autoFocus
            onClick={() => void next()}
            disabled={busy}
            className="w-full rounded-md bg-clinical-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-clinical-700 hover:shadow-lift disabled:opacity-60"
          >
            Next card <span className="opacity-70">↵</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => void submit()}
            disabled={selected == null || busy}
            className="w-full rounded-md bg-clinical-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-clinical-700 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            Check answer <span className="opacity-70">↵</span>
          </button>
          <p className="text-center text-[11px] text-slate-400">
            Press <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">1</kbd>–
            <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">{current.options.length}</kbd> to choose ·{" "}
            <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">Enter</kbd> to check
          </p>
        </div>
      )}
    </div>
  );
}
