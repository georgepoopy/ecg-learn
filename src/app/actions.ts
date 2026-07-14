"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserId, ensureUser } from "@/lib/user";
import { computeMastery } from "@/lib/srs";
import { newCardFields, schedule } from "@/lib/fsrs";
import type { QuestionPayload, SubmitResult } from "@/lib/types";

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

  const questions = await prisma.question.findMany({ where: { typeId }, select: { id: true } });
  const card = newCardFields(now);
  await prisma.$transaction(
    questions.map((q) =>
      prisma.questionState.upsert({
        where: { userId_questionId: { userId, questionId: q.id } },
        update: {},
        create: {
          userId,
          questionId: q.id,
          dueAt: card.dueAt,
          stability: card.stability,
          difficulty: card.difficulty,
          state: card.state,
        },
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/learn/${typeId}`);
  return { count: questions.length };
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
  const { preferType, excludeId, mode = "review", tier, kind } = opts;
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
  if (preferType && typeIds.includes(preferType)) typeIds = [preferType];

  const questionFilter: Record<string, unknown> = { typeId: { in: typeIds } };
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

  // Candidate pool: due items for review mode; everything for free mode.
  let ahead = false;
  let pool = await prisma.questionState.findMany({
    where: mode === "review" ? { ...baseWhere, dueAt: { lte: now } } : baseWhere,
    include: { question: { include: { type: true, record: true } } },
    orderBy: { dueAt: "asc" },
    take: 300,
  });
  if (pool.length === 0 && mode === "review") {
    // Nothing due — practise ahead with the soonest/weakest items.
    ahead = true;
    pool = await prisma.questionState.findMany({
      where: baseWhere,
      include: { question: { include: { type: true, record: true } } },
      orderBy: { dueAt: "asc" },
      take: 300,
    });
  }
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
