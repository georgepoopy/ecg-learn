/**
 * FSRS scheduling wrapper (ts-fsrs). Converts between our DB `QuestionState`
 * shape and ts-fsrs `Card`, maps an MCQ outcome to an FSRS rating, and exposes
 * predicted recall (retrievability) for the mastery dashboard.
 */
import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  State,
  type Card,
  type Grade,
} from "ts-fsrs";

const scheduler = fsrs(
  generatorParameters({ enable_fuzz: true, request_retention: 0.9 }),
);

/** The subset of FSRS card data we persist. */
export interface CardFields {
  dueAt: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  learningSteps: number;
  state: number;
  lastReview: Date | null;
}

export function newCardFields(now: Date = new Date()): CardFields {
  const c = createEmptyCard(now);
  return fromCard(c);
}

function toCard(f: CardFields): Card {
  return {
    due: f.dueAt,
    stability: f.stability,
    difficulty: f.difficulty,
    elapsed_days: f.elapsedDays,
    scheduled_days: f.scheduledDays,
    reps: f.reps,
    lapses: f.lapses,
    learning_steps: f.learningSteps,
    state: f.state as State,
    last_review: f.lastReview ?? undefined,
  };
}

function fromCard(c: Card): CardFields {
  return {
    dueAt: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    learningSteps: c.learning_steps,
    state: c.state,
    lastReview: c.last_review ?? null,
  };
}

/**
 * Map an MCQ result to an FSRS rating.
 *  - wrong            → Again
 *  - correct & fast   → Easy   (< 5 s)
 *  - correct & slow   → Hard   (> 20 s)
 *  - correct          → Good
 */
export function gradeToRating(correct: boolean, responseMs?: number): Grade {
  if (!correct) return Rating.Again;
  if (responseMs != null && responseMs < 5000) return Rating.Easy;
  if (responseMs != null && responseMs > 20000) return Rating.Hard;
  return Rating.Good;
}

export interface ScheduleOutcome extends CardFields {
  rating: number;
}

/** Advance a card by one review. */
export function schedule(
  prev: CardFields,
  correct: boolean,
  responseMs: number | undefined,
  now: Date = new Date(),
): ScheduleOutcome {
  const rating = gradeToRating(correct, responseMs);
  const { card } = scheduler.next(toCard(prev), now, rating);
  return { ...fromCard(card), rating };
}

/** Predicted probability of recall right now (0..1). */
export function retrievability(f: CardFields, now: Date = new Date()): number {
  if (f.state === State.New || f.reps === 0) return 0;
  return scheduler.get_retrievability(toCard(f), now, false) as number;
}

export const CardState = State;
