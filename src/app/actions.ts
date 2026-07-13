"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { scheduleSm2, computeMastery, DEFAULT_SRS } from "@/lib/srs";
import type { QuestionPayload, SubmitResult } from "@/lib/types";

const USER_ID = "local";

async function ensureUser(): Promise<void> {
  await prisma.user.upsert({ where: { id: USER_ID }, update: {}, create: { id: USER_ID } });
}

/** Mark a lesson complete: unlock the type and add its questions to the bank. */
export async function unlockType(typeId: string): Promise<{ count: number }> {
  await ensureUser();
  const now = new Date();

  await prisma.typeProgress.upsert({
    where: { userId_typeId: { userId: USER_ID, typeId } },
    update: { unlocked: true, unlockedAt: now },
    create: { userId: USER_ID, typeId, unlocked: true, unlockedAt: now },
  });

  const questions = await prisma.question.findMany({ where: { typeId }, select: { id: true } });
  // Seed a review card per question, all due immediately.
  await prisma.$transaction(
    questions.map((q) =>
      prisma.questionState.upsert({
        where: { userId_questionId: { userId: USER_ID, questionId: q.id } },
        update: {},
        create: { userId: USER_ID, questionId: q.id, dueAt: now },
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/learn/${typeId}`);
  return { count: questions.length };
}

async function countDue(typeIds: string[]): Promise<number> {
  if (typeIds.length === 0) return 0;
  return prisma.questionState.count({
    where: { userId: USER_ID, dueAt: { lte: new Date() }, question: { typeId: { in: typeIds } } },
  });
}

type StateWithQuestion = NonNullable<Awaited<ReturnType<typeof findNextState>>>;

function findNextState(where: object) {
  return prisma.questionState.findFirst({
    where,
    orderBy: { dueAt: "asc" },
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
          ecgId: q.record.ecgId,
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

/**
 * Next card to review. Prefers genuinely-due cards (most overdue first). If
 * none are due, returns the soonest-due card as "practice ahead". `preferType`
 * restricts to one unlocked type. `excludeId` avoids showing the same card twice
 * in a row when practicing ahead.
 */
export async function fetchNextQuestion(
  preferType?: string,
  excludeId?: string,
): Promise<QuestionPayload | null> {
  await ensureUser();
  const now = new Date();

  const unlocked = await prisma.typeProgress.findMany({
    where: { userId: USER_ID, unlocked: true },
    select: { typeId: true },
  });
  const allTypeIds = unlocked.map((u) => u.typeId);
  if (allTypeIds.length === 0) return null;

  const typeIds =
    preferType && allTypeIds.includes(preferType) ? [preferType] : allTypeIds;
  const dueRemaining = await countDue(typeIds);

  const notExcluded = excludeId ? { questionId: { not: excludeId } } : {};

  // 1. A genuinely-due card.
  let state = await findNextState({
    userId: USER_ID,
    dueAt: { lte: now },
    question: { typeId: { in: typeIds } },
    ...notExcluded,
  });
  let ahead = false;

  // 2. Otherwise, practice ahead with the soonest-due card.
  if (!state) {
    state = await findNextState({
      userId: USER_ID,
      question: { typeId: { in: typeIds } },
      ...notExcluded,
    });
    ahead = true;
  }
  // 3. Fallback: allow the excluded card if it's the only one.
  if (!state) {
    state = await findNextState({ userId: USER_ID, question: { typeId: { in: typeIds } } });
    ahead = true;
  }
  if (!state) return null;

  return toPayload(state, dueRemaining, ahead);
}

async function recomputeMastery(typeId: string): Promise<number> {
  const total = await prisma.question.count({ where: { typeId } });
  const states = await prisma.questionState.findMany({
    where: { userId: USER_ID, question: { typeId } },
    select: { repetitions: true, lastSeenAt: true },
  });
  const attempts = await prisma.attempt.findMany({
    where: { userId: USER_ID, question: { typeId } },
    select: { correct: true },
  });

  const attempted = states.filter((s) => s.lastSeenAt != null).length;
  const retained = states.filter((s) => s.repetitions >= 2).length;
  const seenCount = attempts.length;
  const correctCount = attempts.filter((a) => a.correct).length;

  const score = computeMastery({ total, attempted, seenCount, correctCount, retained });

  await prisma.typeProgress.update({
    where: { userId_typeId: { userId: USER_ID, typeId } },
    data: { masteryScore: score, seenCount, correctCount },
  });
  return score;
}

/** Grade an answer, update the SRS schedule, log the attempt, refresh mastery. */
export async function submitAnswer(
  questionId: string,
  chosenOptionId: string,
  responseMs?: number,
): Promise<SubmitResult> {
  await ensureUser();
  const now = new Date();

  const q = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
  const correct = chosenOptionId === q.correctOptionId;

  const existing = await prisma.questionState.findUnique({
    where: { userId_questionId: { userId: USER_ID, questionId } },
  });
  const prev = existing
    ? { ease: existing.ease, intervalDays: existing.intervalDays, repetitions: existing.repetitions }
    : DEFAULT_SRS;
  const upd = scheduleSm2(prev, correct, responseMs, now);

  await prisma.questionState.upsert({
    where: { userId_questionId: { userId: USER_ID, questionId } },
    update: {
      ease: upd.ease,
      intervalDays: upd.intervalDays,
      repetitions: upd.repetitions,
      dueAt: upd.dueAt,
      lastGrade: correct ? 1 : 0,
      lastSeenAt: now,
    },
    create: {
      userId: USER_ID,
      questionId,
      ease: upd.ease,
      intervalDays: upd.intervalDays,
      repetitions: upd.repetitions,
      dueAt: upd.dueAt,
      lastGrade: correct ? 1 : 0,
      lastSeenAt: now,
    },
  });

  await prisma.attempt.create({
    data: { userId: USER_ID, questionId, correct, chosenOptionId, responseMs: responseMs ?? null },
  });

  const typeMastery = await recomputeMastery(q.typeId);
  revalidatePath("/");
  revalidatePath("/dashboard");

  return { correct, correctOptionId: q.correctOptionId, explanation: q.explanation, typeMastery };
}
