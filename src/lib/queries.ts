/** Read-side queries for server components (curriculum, lesson, dashboard). */
import { prisma } from "@/lib/prisma";
import { isMastered } from "@/lib/srs";

const USER_ID = "local";

export interface CurriculumItem {
  id: string;
  name: string;
  shortName: string;
  superclass: string;
  summary: string;
  order: number;
  estMinutes: number;
  questionCount: number;
  unlocked: boolean;
  /** Lesson can be opened (previous type unlocked, or it's the first). */
  available: boolean;
  masteryScore: number;
  mastered: boolean;
  dueCount: number;
  seenCount: number;
  correctCount: number;
}

export async function getCurriculum(): Promise<CurriculumItem[]> {
  const now = new Date();
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
    ecgId: number;
    signalsB64: string;
    leadOrder: string[];
    gain: number;
    fs: number;
    nSamples: number;
    leadFocus: string | null;
  } | null;
}

export async function getLesson(typeId: string): Promise<LessonView | null> {
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

  // Availability: previous-by-order type must be unlocked (or none exists).
  const prev = await prisma.ecgType.findFirst({
    where: { order: { lt: type.order } },
    orderBy: { order: "desc" },
    include: { progress: { where: { userId: USER_ID } } },
  });
  const available = !prev || (prev.progress[0]?.unlocked ?? false);

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
          ecgId: rec.ecgId,
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
  };
}

export async function getDashboard(): Promise<DashboardData> {
  const types = await getCurriculum();
  const attempts = await prisma.attempt.count({ where: { userId: USER_ID } });
  const correct = await prisma.attempt.count({ where: { userId: USER_ID, correct: true } });
  const bankSize = types.filter((t) => t.unlocked).reduce((n, t) => n + t.questionCount, 0);

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
    },
  };
}
