/** Read-side queries for server components (curriculum, lesson, dashboard). */
import { prisma } from "@/lib/prisma";
import { isMastered } from "@/lib/srs";
import { getUserId } from "@/lib/user";
import { retrievability } from "@/lib/fsrs";

export interface CurriculumItem {
  id: string;
  name: string;
  shortName: string;
  superclass: string;
  summary: string;
  order: number;
  tier: string;
  estMinutes: number;
  questionCount: number;
  unlocked: boolean;
  /** Suggested next in the guided course (previous type unlocked, or first). */
  available: boolean;
  masteryScore: number;
  mastered: boolean;
  dueCount: number;
  seenCount: number;
  correctCount: number;
}

export async function getCurriculum(): Promise<CurriculumItem[]> {
  const now = new Date();
  const USER_ID = await getUserId();
  const types = await prisma.ecgType.findMany({
    orderBy: { order: "asc" },
    include: {
      lesson: true,
      _count: { select: { questions: true } },
      progress: { where: { userId: USER_ID } },
    },
  });

  // Due counts per type in one grouped query.
  const dueRows = await prisma.questionState.groupBy({
    by: ["questionId"],
    where: { userId: USER_ID, dueAt: { lte: now } },
    _count: true,
  });
  // Map questionId -> typeId to aggregate by type.
  const dueQuestionIds = dueRows.map((r) => r.questionId);
  const dueQuestions = dueQuestionIds.length
    ? await prisma.question.findMany({
        where: { id: { in: dueQuestionIds } },
        select: { id: true, typeId: true },
      })
    : [];
  const dueByType = new Map<string, number>();
  for (const q of dueQuestions) {
    dueByType.set(q.typeId, (dueByType.get(q.typeId) ?? 0) + 1);
  }

  const items: CurriculumItem[] = [];
  let prevUnlocked = true; // first lesson is always available
  for (const t of types) {
    const prog = t.progress[0];
    const unlocked = prog?.unlocked ?? false;
    const masteryScore = prog?.masteryScore ?? 0;
    const questionCount = t._count.questions;
    const coverage = questionCount ? (prog?.seenCount ?? 0) > 0 : false;
    items.push({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      superclass: t.superclass,
      summary: t.summary,
      order: t.order,
      tier: t.tier,
      estMinutes: t.lesson?.estMinutes ?? 5,
      questionCount,
      unlocked,
      available: prevUnlocked,
      masteryScore,
      mastered: isMastered(masteryScore, coverage ? 1 : 0),
      dueCount: dueByType.get(t.id) ?? 0,
      seenCount: prog?.seenCount ?? 0,
      correctCount: prog?.correctCount ?? 0,
    });
    prevUnlocked = unlocked;
  }
  return items;
}

export interface LessonView {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  estMinutes: number;
  sections: { heading: string; body: string }[];
  keyFacts: string[];
  unlocked: boolean;
  available: boolean;
  questionCount: number;
  sampleRecord: {
    source: string;
    externalId: string;
    signalsB64: string;
    leadOrder: string[];
    gain: number;
    fs: number;
    nSamples: number;
    leadFocus: string | null;
  } | null;
}

export async function getLesson(typeId: string): Promise<LessonView | null> {
  const USER_ID = await getUserId();
  const type = await prisma.ecgType.findUnique({
    where: { id: typeId },
    include: {
      lesson: true,
      progress: { where: { userId: USER_ID } },
      // Prefer an "identify" question with a real waveform for the lesson example.
      questions: {
        take: 1,
        where: { kind: "identify", recordId: { not: null } },
        orderBy: { id: "asc" },
        include: { record: true },
      },
    },
  });
  if (!type || !type.lesson) return null;

  // Self-paced: every lesson is available anytime (no forced ordering).
  const available = true;

  const q = type.questions[0];
  const rec = q?.record;
  return {
    id: type.id,
    name: type.name,
    shortName: type.shortName,
    summary: type.summary,
    estMinutes: type.lesson.estMinutes,
    sections: JSON.parse(type.lesson.sections),
    keyFacts: JSON.parse(type.lesson.keyFacts),
    unlocked: type.progress[0]?.unlocked ?? false,
    available,
    questionCount: await prisma.question.count({ where: { typeId } }),
    sampleRecord: rec
      ? {
          source: rec.source,
          externalId: rec.externalId,
          signalsB64: rec.signalsB64,
          leadOrder: JSON.parse(rec.leads),
          gain: rec.gain,
          fs: rec.fs,
          nSamples: rec.nSamples,
          leadFocus: q.leadFocus,
        }
      : null,
  };
}

export interface TierStat {
  tier: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface DashboardData {
  types: CurriculumItem[];
  totals: {
    unlockedTypes: number;
    totalTypes: number;
    masteredTypes: number;
    dueNow: number;
    totalAttempts: number;
    correctAttempts: number;
    bankSize: number; // questions in unlocked types
    avgRetention: number; // FSRS predicted recall across reviewed cards (0..1)
  };
  tierStats: TierStat[];
  /** Weakest unlocked types (lowest mastery), for "focus here" guidance. */
  weakAreas: CurriculumItem[];
  strongAreas: CurriculumItem[];
}

const TIER_ORDER = ["foundational", "intermediate", "advanced", "expert"];

export async function getDashboard(): Promise<DashboardData> {
  const USER_ID = await getUserId();
  const types = await getCurriculum();
  const attempts = await prisma.attempt.count({ where: { userId: USER_ID } });
  const correct = await prisma.attempt.count({ where: { userId: USER_ID, correct: true } });
  const bankSize = types.filter((t) => t.unlocked).reduce((n, t) => n + t.questionCount, 0);

  // Per-tier accuracy from the attempt log.
  const attemptRows = await prisma.attempt.findMany({
    where: { userId: USER_ID },
    select: { correct: true, question: { select: { tier: true } } },
  });
  const tierMap = new Map<string, { a: number; c: number }>();
  for (const r of attemptRows) {
    const t = r.question.tier;
    const e = tierMap.get(t) ?? { a: 0, c: 0 };
    e.a++;
    if (r.correct) e.c++;
    tierMap.set(t, e);
  }
  const tierStats: TierStat[] = TIER_ORDER.filter((t) => tierMap.has(t)).map((t) => {
    const e = tierMap.get(t)!;
    return { tier: t, attempts: e.a, correct: e.c, accuracy: e.a ? e.c / e.a : 0 };
  });

  // Predicted retention across reviewed cards (FSRS retrievability).
  const reviewed = await prisma.questionState.findMany({
    where: { userId: USER_ID, reps: { gt: 0 } },
    select: {
      dueAt: true, stability: true, difficulty: true, elapsedDays: true,
      scheduledDays: true, reps: true, lapses: true, learningSteps: true,
      state: true, lastReview: true,
    },
  });
  let retSum = 0;
  for (const s of reviewed) {
    retSum += retrievability({
      dueAt: s.dueAt, stability: s.stability, difficulty: s.difficulty,
      elapsedDays: s.elapsedDays, scheduledDays: s.scheduledDays, reps: s.reps,
      lapses: s.lapses, learningSteps: s.learningSteps, state: s.state,
      lastReview: s.lastReview,
    });
  }
  const avgRetention = reviewed.length ? retSum / reviewed.length : 0;

  const unlocked = types.filter((t) => t.unlocked && t.seenCount > 0);
  const byMastery = [...unlocked].sort((a, b) => a.masteryScore - b.masteryScore);

  return {
    types,
    totals: {
      unlockedTypes: types.filter((t) => t.unlocked).length,
      totalTypes: types.length,
      masteredTypes: types.filter((t) => t.mastered).length,
      dueNow: types.reduce((n, t) => n + t.dueCount, 0),
      totalAttempts: attempts,
      correctAttempts: correct,
      bankSize,
      avgRetention,
    },
    tierStats,
    weakAreas: byMastery.slice(0, 3),
    strongAreas: byMastery.slice(-3).reverse(),
  };
}
