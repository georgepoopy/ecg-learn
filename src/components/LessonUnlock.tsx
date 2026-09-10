"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockType } from "@/app/actions";

export default function LessonUnlock({
  typeId,
  unlocked,
  questionCount,
}: {
  typeId: string;
  unlocked: boolean;
  questionCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(unlocked);

  if (done || unlocked) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          ✓ Learned
        </span>
        <button
          onClick={() => router.push("/practice")}
          className="rounded-md bg-clinical-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-clinical-700"
        >
          Practise (mixed review) →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await unlockType(typeId);
            setDone(true);
            router.push("/practice"); // blind, interleaved: mixes the new type with all learned so far
          })
        }
        className="rounded-md bg-clinical-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-700 disabled:opacity-60"
      >
        {pending ? "Starting…" : "I've studied this — test me →"}
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        You&apos;ll get a short set on this rhythm, unlabelled and mixed in with what
        you&apos;ve already learned — so you have to recognise it, not just recall the
        lesson. {questionCount > 0 && `More of its ${questionCount} tracings resurface over time.`}
      </p>
    </div>
  );
}
