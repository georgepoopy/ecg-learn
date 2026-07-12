/**
 * Spaced-repetition scheduling (SM-2 variant) + per-type mastery scoring.
 * Pure functions — no I/O — so they're easy to reason about and test.
 */

export interface SrsState {
  ease: number; // SM-2 easiness factor (>= 1.3)
  intervalDays: number;
  repetitions: number; // consecutive correct reviews
}

export interface SrsUpdate extends SrsState {
  dueAt: Date;
}

export const DEFAULT_SRS: SrsState = { ease: 2.5, intervalDays: 0, repetitions: 0 };

/** Map a binary MCQ outcome (+ optional speed) to an SM-2 quality 0..5. */
export function gradeToQuality(correct: boolean, responseMs?: number): number {
  if (!correct) return 2; // lapse
  if (responseMs != null && responseMs < 6000) return 5; // confident + fast
  return 4; // correct
}

/**
 * Compute the next SRS state after a review.
 * Lapses (wrong) reset the card and recirculate it within the session (~1 min),
 * so the learner re-sees what they missed instead of waiting a day.
 */
export function scheduleSm2(
  prev: SrsState,
  correct: boolean,
  responseMs: number | undefined,
  now: Date = new Date(),
): SrsUpdate {
  const q = gradeToQuality(correct, responseMs);
  let { ease, intervalDays, repetitions } = prev;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
    return { ease, intervalDays, repetitions, dueAt: new Date(now.getTime() + 60_000) };
  }

  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  repetitions += 1;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 6;
  else intervalDays = Math.round(intervalDays * ease);

  const dueAt = new Date(now.getTime() + intervalDays * 86_400_000);
  return { ease, intervalDays, repetitions, dueAt };
}

// --- Mastery -----------------------------------------------------------------

export interface MasteryInputs {
  total: number; // questions in the type
  attempted: number; // distinct questions answered at least once
  seenCount: number; // total attempts
  correctCount: number; // total correct attempts
  retained: number; // questions with repetitions >= 2 (graduated)
}

/**
 * Blended 0..1 mastery: retention dominates (are cards sticking?), tempered by
 * overall accuracy and how much of the type has been covered.
 */
export function computeMastery(i: MasteryInputs): number {
  const coverage = i.total ? i.attempted / i.total : 0;
  const accuracy = i.seenCount ? i.correctCount / i.seenCount : 0;
  const retention = i.total ? i.retained / i.total : 0;
  return Math.min(1, 0.5 * retention + 0.3 * accuracy + 0.2 * coverage);
}

/** A type counts as "mastered" when it's well retained and fully covered. */
export function isMastered(score: number, coverage: number): boolean {
  return score >= 0.8 && coverage >= 0.999;
}
