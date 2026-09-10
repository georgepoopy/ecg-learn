"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserId, ensureUser } from "@/lib/user";
import { computeMastery } from "@/lib/srs";
import { newCardFields, schedule } from "@/lib/fsrs";
import type { QuestionPayload, SubmitResult } from "@/lib/types";

// How many of a freshly-learned type's questions become an *active* test batch
// right after the lesson. The rest are held in reserve (far-future due) and
// trickle in over later sessions — so you're tested on a reasonable set, not all
// ~100 at once, and there's always fresh material left to mix into future study.
const INITIAL_ACTIVE = 12;
// "Reserve" = exists in your bank but not due yet (~10 years out). The scheduler
// promotes these once you've worked through what's currently due.
const RESERVE_OFFSET_MS = 3650 * 86_400_000;
// When you learn a NEW type, pull this many cards from PREVIOUSLY-learned types
// back into the due pile — prioritising ones you got wrong — so each new lesson
// interleaves old rhythms with the new and you practise telling them apart.
const DIFFERENTIATORS_PER_UNLOCK = 8;

/** Interleave a list across its question kinds so a batch spans identify / rate /
 * axis / … instead of a run of near-identical prompts. */
function roundRobinByKind<T extends { kind: string }>(items: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const q of items) {
    const b = buckets.get(q.kind);
    if (b) b.push(q);
    else buckets.set(q.kind, [q]);
  }
  const lists = [...buckets.values()];
  const out: T[] = [];
  for (let more = true; more; ) {
    more = false;
    for (const list of lists) {
      const x = list.shift();
      if (x) {
        out.push(x);
        more = true;
      }
    }
  }
  return out;
}

/**
 * On unlocking a new type, bring a few cards from earlier-learned types back to
 * "due now" so the upcoming (blind) practice mixes old rhythms with the new.
 * Prefers questions you've previously gotten wrong, then unseen reserve cards,
 * and spreads the picks across your earlier types.
 */
async function promoteDifferentiators(userId: string, excludeTypeId: string, now: Date): Promise<void> {
  const prior = await prisma.typeProgress.findMany({
    where: { userId, unlocked: true, NOT: { typeId: excludeTypeId } },
    select: { typeId: true },
  });
  if (prior.length === 0) return;
  const priorIds = prior.map((p) => p.typeId);

  const candidates = await prisma.questionState.findMany({
    where: {
      userId,
      dueAt: { gt: now }, // not already due
      question: { typeId: { in: priorIds }, reviewStatus: "approved" },
    },
    select: { questionId: true, question: { select: { typeId: true } } },
    orderBy: [{ lapses: "desc" }, { reps: "asc" }], // previously-wrong first, then unseen
    take: 200,
  });

  const perType = Math.max(1, Math.ceil(DIFFERENTIATORS_PER_UNLOCK / priorIds.length));
  const perTypeCount = new Map<string, number>();
  const pick: string[] = [];
  for (const c of candidates) {
    if (pick.length >= DIFFERENTIATORS_PER_UNLOCK) break;
    const t = c.question.typeId;
    if ((perTypeCount.get(t) ?? 0) >= perType) continue;
    perTypeCount.set(t, (perTypeCount.get(t) ?? 0) + 1);
    pick.push(c.questionId);
  }
  if (pick.length > 0) {
    await prisma.questionState.updateMany({
      where: { userId, questionId: { in: pick } },
      data: { dueAt: now },
    });
  }
}

/** Mark a lesson complete: unlock the type and add its questions to the bank. */
export async function unlockType(typeId: string): Promise<{ count: number }> {
  const userId = await getUserId();
  await ensureUser(userId);
  const now = new Date();

  await prisma.typeProgress.upsert({
    where: { userId_typeId: { userId, typeId } },
    update: { unlocked: true, unlockedAt: now },
    create: { userId, typeId, unlocked: true, unlockedAt: now },
  });

  // Only approved questions enter the live bank (authored/pending items are held
  // out until clinician sign-off). Seed a review card per question in a SINGLE
  // bulk insert — doing 100+ upserts one-by-one over a network DB blows the
  // serverless time limit. We compute the missing set first so re-learning a
  // type is idempotent without needing SQLite's unsupported skipDuplicates.
  const questions = await prisma.question.findMany({
    where: { typeId, reviewStatus: "approved" },
    select: { id: true, kind: true },
  });
  const existing = await prisma.questionState.findMany({
    where: { userId, question: { typeId } },
    select: { questionId: true },
  });
  const have = new Set(existing.map((e) => e.questionId));
  const fresh = questions.filter((q) => !have.has(q.id));

  // Only a small, kind-diverse batch is due immediately; the rest go to reserve
  // so you get a reasonable test set now with plenty held back for later.
  const activeIds = new Set(
    roundRobinByKind(fresh)
      .slice(0, INITIAL_ACTIVE)
      .map((q) => q.id),
  );
  const card = newCardFields(now);
  const reserveDue = new Date(now.getTime() + RESERVE_OFFSET_MS);
  const toCreate = fresh.map((q) => ({
    userId,
    questionId: q.id,
    dueAt: activeIds.has(q.id) ? card.dueAt : reserveDue,
    stability: card.stability,
    difficulty: card.difficulty,
    state: card.state,
  }));
  if (toCreate.length > 0) {
    await prisma.questionState.createMany({ data: toCreate });
  }

  // Mix a few earlier-learned rhythms back in for differentiation practice.
  await promoteDifferentiators(userId, typeId, now);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/learn/${typeId}`);
  return { count: activeIds.size };
}

type StateWithQuestion = NonNullable<Awaited<ReturnType<typeof findState>>>;

function findState(where: object) {
  return prisma.questionState.findFirst({
    where,
    include: { question: { include: { type: true, record: true } } },
  });
}

function toPayload(state: StateWithQuestion, dueRemaining: number, ahead: boolean): QuestionPayload {
  const q = state.question;
  return {
    questionId: q.id,
    typeId: q.typeId,
    typeName: q.type.name,
    shortName: q.type.shortName,
    stem: q.stem,
    kind: q.kind,
    tier: q.tier,
    options: JSON.parse(q.options),
    leadFocus: q.leadFocus,
    record: q.record
      ? {
          source: q.record.source,
          externalId: q.record.externalId,
          signalsB64: q.record.signalsB64,
          leadOrder: JSON.parse(q.record.leads),
          gain: q.record.gain,
          fs: q.record.fs,
          nSamples: q.record.nSamples,
        }
      : null,
    dueRemaining,
    ahead,
  };
}

export interface NextOptions {
  preferType?: string;
  /** Restrict to this set of type ids (e.g. a category), intersected with unlocked. */
  typeIds?: string[];
  excludeId?: string;
  /** "review" = due-first (default); "free" = drill anything, weak items first. */
  mode?: "review" | "free";
  tier?: string;
  kind?: string;
}

/**
 * Next card via cumulative, interleaved, weighted selection across everything
 * the user has unlocked. Due items are strongly preferred; weak types (low
 * mastery, low stability) are up-weighted; the same type twice in a row is
 * down-weighted so sessions interleave old and new material.
 */
export async function fetchNextQuestion(opts: NextOptions = {}): Promise<QuestionPayload | null> {
  const { preferType, typeIds: restrictTypeIds, excludeId, tier, kind } = opts;
  const userId = await getUserId();
  await ensureUser(userId);
  const now = new Date();

  const unlocked = await prisma.typeProgress.findMany({
    where: { userId, unlocked: true },
    select: { typeId: true, masteryScore: true },
  });
  if (unlocked.length === 0) return null;
  const masteryByType = new Map(unlocked.map((u) => [u.typeId, u.masteryScore]));

  let typeIds = unlocked.map((u) => u.typeId);
  if (restrictTypeIds && restrictTypeIds.length > 0) {
    typeIds = typeIds.filter((id) => restrictTypeIds.includes(id));
  }
  if (preferType && typeIds.includes(preferType)) typeIds = [preferType];
  if (typeIds.length === 0) return null;

  const questionFilter: Record<string, unknown> = {
    typeId: { in: typeIds },
    reviewStatus: "approved",
  };
  if (kind) questionFilter.kind = kind;
  if (tier) questionFilter.tier = tier;

  const dueRemaining = await prisma.questionState.count({
    where: { userId, dueAt: { lte: now }, question: questionFilter },
  });

  // Last-served type (to interleave away from it).
  let lastType: string | null = null;
  if (excludeId) {
    const prev = await prisma.question.findUnique({
      where: { id: excludeId },
      select: { typeId: true },
    });
    lastType = prev?.typeId ?? null;
  }

  const baseWhere: Record<string, unknown> = { userId, question: questionFilter };
  if (excludeId) baseWhere.questionId = { not: excludeId };

  // Candidate pool. Both modes draw from EVERYTHING the user has unlocked (the
  // soonest-due 400) rather than only the strictly-due cards, so earlier-learned
  // ECGs keep resurfacing interleaved with the newest type. The weighting below
  // strongly prefers due + weak items, so genuinely-due cards still lead.
  const pool = await prisma.questionState.findMany({
    where: baseWhere,
    include: { question: { include: { type: true, record: true } } },
    orderBy: { dueAt: "asc" },
    take: 400,
  });
  const ahead = dueRemaining === 0;
  if (pool.length === 0) {
    // Only the excluded card remains.
    const only = await findState({ userId, question: questionFilter });
    return only ? toPayload(only, dueRemaining, true) : null;
  }

  // Weighted pick.
  const weightOf = (s: (typeof pool)[number]): number => {
    const overdueH = Math.max(0, (now.getTime() - s.dueAt.getTime()) / 3_600_000);
    let w = 1 + Math.min(overdueH, 72) / 12; // recency of due-ness (up to +6)
    const mastery = masteryByType.get(s.question.typeId) ?? 0;
    w *= 1 + (1 - mastery) * 1.5; // weak types up to 2.5×
    w *= 1 + 1 / (s.stability + 1); // low-stability (fragile) items up-weighted
    w *= 1 + Math.min(s.lapses, 4) * 0.7; // resurface questions you've gotten wrong
    // Reserve cards (unseen, parked in the future) are held back while you still
    // have due cards to work — so a lesson gives a bounded batch, and fresh
    // material only flows once you've cleared it.
    if (s.reps === 0 && s.dueAt.getTime() > now.getTime() && dueRemaining > 0) w *= 0.25;
    if (s.question.typeId === lastType) w *= 0.25; // interleave away from last type
    return w;
  };
  const weights = pool.map(weightOf);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let chosen = pool[0];
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      chosen = pool[i];
      break;
    }
  }

  return toPayload(chosen, dueRemaining, ahead);
}

async function recomputeMastery(userId: string, typeId: string): Promise<number> {
  const total = await prisma.question.count({ where: { typeId } });
  const states = await prisma.questionState.findMany({
    where: { userId, question: { typeId } },
    select: { state: true, stability: true, lastSeenAt: true },
  });
  const attempts = await prisma.attempt.findMany({
    where: { userId, question: { typeId } },
    select: { correct: true },
  });

  const attempted = states.filter((s) => s.lastSeenAt != null).length;
  // "Retained" = graduated to Review with a non-trivial stability.
  const retained = states.filter((s) => s.state === 2 && s.stability >= 4).length;
  const seenCount = attempts.length;
  const correctCount = attempts.filter((a) => a.correct).length;

  const score = computeMastery({ total, attempted, seenCount, correctCount, retained });
  await prisma.typeProgress.update({
    where: { userId_typeId: { userId, typeId } },
    data: { masteryScore: score, seenCount, correctCount },
  });
  return score;
}

/** Grade an answer with FSRS, log the attempt, refresh mastery. */
export async function submitAnswer(
  questionId: string,
  chosenOptionId: string,
  responseMs?: number,
): Promise<SubmitResult> {
  const userId = await getUserId();
  await ensureUser(userId);
  const now = new Date();

  const q = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
  const correct = chosenOptionId === q.correctOptionId;

  const existing = await prisma.questionState.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  const prevCard = existing
    ? {
        dueAt: existing.dueAt,
        stability: existing.stability,
        difficulty: existing.difficulty,
        elapsedDays: existing.elapsedDays,
        scheduledDays: existing.scheduledDays,
        reps: existing.reps,
        lapses: existing.lapses,
        learningSteps: existing.learningSteps,
        state: existing.state,
        lastReview: existing.lastReview,
      }
    : newCardFields(now);

  const upd = schedule(prevCard, correct, responseMs, now);
  const data = {
    dueAt: upd.dueAt,
    stability: upd.stability,
    difficulty: upd.difficulty,
    elapsedDays: upd.elapsedDays,
    scheduledDays: upd.scheduledDays,
    reps: upd.reps,
    lapses: upd.lapses,
    learningSteps: upd.learningSteps,
    state: upd.state,
    lastReview: now,
    lastGrade: upd.rating,
    lastSeenAt: now,
  };

  await prisma.questionState.upsert({
    where: { userId_questionId: { userId, questionId } },
    update: data,
    create: { userId, questionId, ...data },
  });
  await prisma.attempt.create({
    data: { userId, questionId, correct, chosenOptionId, responseMs: responseMs ?? null },
  });

  const typeMastery = await recomputeMastery(userId, q.typeId);
  revalidatePath("/");
  revalidatePath("/dashboard");

  return { correct, correctOptionId: q.correctOptionId, explanation: q.explanation, typeMastery };
}
