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
          ✓ Unlocked
        </span>
        <button
          onClick={() => router.push(`/practice?type=${typeId}`)}
          className="rounded-md bg-clinical-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-clinical-700"
        >
          Practice this type →
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await unlockType(typeId);
          setDone(true);
          router.push(`/practice?type=${typeId}`);
        })
      }
      className="rounded-md bg-clinical-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-700 disabled:opacity-60"
    >
      {pending ? "Unlocking…" : `Complete lesson & unlock ${questionCount} questions →`}
    </button>
  );
}
