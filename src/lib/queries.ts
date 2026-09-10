/** Read-side queries for server components (curriculum, lesson, dashboard). */
import { prisma } from "@/lib/prisma";
import { isMastered } from "@/lib/srs";
import { getUserId } from "@/lib/user";
import { retrievability } from "@/lib/fsrs";
import {
  prereqOf,
  demonstratedCompetence,
  TYPE_LOCATION,
  type ProgressStatus,
} from "@/lib/categories";

export interface CurriculumItem {
  id: string;
  name: string;
  shortName: string;
  superclass: string;
  summary: string;
  order: number;
  tier: string;
  estMinutes: number;
  questionCount: number; // APPROVED (live-bank) questions only
  /** True when the type has only authored/pending questions (held from the bank). */
  pendingReview: boolean;
  unlocked: boolean;
  /** Not locked in the guided path (available/learning/mastered). */
  available: boolean;
  masteryScore: number;
  mastered: boolean;
  dueCount: number;
  seenCount: number;
  correctCount: number;
  // Progression
  status: ProgressStatus; // mastered | learning | available | locked
  categoryId: string;
  categoryLabel: string;
  subLabel: string;
  prereqId: string | null;
  prereqName: string | null;
}

export async function getCurriculum(): Promise<CurriculumItem[]> {
  const now = new Date();
  const USER_ID = await getUserId();
  const types = await prisma.ecgType.findMany({
    orderBy: { order: "asc" },
    include: {
      lesson: true,
      progress: { where: { userId: USER_ID } },
    },
  });

  // Live-bank (approved) and total question counts per type. Authored/pending
  // items are held out of the live bank until clinician sign-off.
  const [approvedRows, totalRows] = await Promise.all([
    prisma.question.groupBy({ by: ["typeId"], where: { reviewStatus: "approved" }, _count: true }),
    prisma.question.groupBy({ by: ["typeId"], _count: true }),
  ]);
  const approvedByType = new Map(approvedRows.map((r) => [r.typeId, r._count]));
  const totalByType = new Map(totalRows.map((r) => [r.typeId, r._count]));

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

  // Per-type progress snapshot, for prerequisite lookups.
  const snap = new Map<string, { unlocked: boolean; mastered: boolean; seen: number; correct: number; mastery: number }>();
  for (const t of types) {
    const p = t.progress[0];
    const mastery = p?.masteryScore ?? 0;
    const seen = p?.seenCount ?? 0;
    snap.set(t.id, {
      unlocked: p?.unlocked ?? false,
      mastered: isMastered(mastery, seen > 0 ? 1 : 0),
      seen,
      correct: p?.correctCount ?? 0,
      mastery,
    });
  }

  const items: CurriculumItem[] = [];
  for (const t of types) {
    const prog = t.progress[0];
    const unlocked = prog?.unlocked ?? false;
    const masteryScore = prog?.masteryScore ?? 0;
    const s = snap.get(t.id)!;
    const prereqId = prereqOf(t.id);
    const prereq = prereqId ? snap.get(prereqId) : null;
    const prereqMet = !prereqId || (prereq ? demonstratedCompetence(prereq.seen, prereq.correct, prereq.mastery) : false);

    const approvedCount = approvedByType.get(t.id) ?? 0;
    const totalCount = totalByType.get(t.id) ?? 0;
    const pendingReview = approvedCount === 0 && totalCount > 0;

    let status: ProgressStatus;
    if (pendingReview) status = "locked"; // held out of the live bank
    else if (s.mastered) status = "mastered";
    else if (unlocked) status = "learning";
    else if (prereqMet) status = "available";
    else status = "locked";

    const loc = TYPE_LOCATION[t.id];
    items.push({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      superclass: t.superclass,
      summary: t.summary,
      order: t.order,
      tier: t.tier,
      estMinutes: t.lesson?.estMinutes ?? 5,
      questionCount: approvedCount,
      pendingReview,
      unlocked,
      available: status !== "locked",
      masteryScore,
      mastered: s.mastered,
      dueCount: dueByType.get(t.id) ?? 0,
      seenCount: s.seen,
      correctCount: s.correct,
      status,
      categoryId: loc?.categoryId ?? "other",
      categoryLabel: loc?.categoryLabel ?? "Other",
      subLabel: loc?.subLabel ?? "",
      prereqId,
      prereqName: prereqId ? types.find((x) => x.id === prereqId)?.name ?? null : null,
    });
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
  status: ProgressStatus;
  pendingReview: boolean;
  prereqName: string | null;
  categoryLabel: string;
  subLabel: string;
  questionCount: number;
  sampleRecord: LessonExample | null;
  /** A few labelled worked examples to study before the (blind) practice. */
  examples: LessonExample[];
}

export interface LessonExample {
  source: string;
  externalId: string;
  signalsB64: string;
  leadOrder: string[];
  gain: number;
  fs: number;
  nSamples: number;
  leadFocus: string | null;
}

export async function getLesson(typeId: string): Promise<LessonView | null> {
  const USER_ID = await getUserId();
  const type = await prisma.ecgType.findUnique({
    where: { id: typeId },
    include: {
      lesson: true,
      progress: { where: { userId: USER_ID } },
      // A few "identify" questions with real waveforms → labelled worked examples.
      questions: {
        take: 3,
        where: { kind: "identify", recordId: { not: null } },
        orderBy: { id: "asc" },
        include: { record: true },
      },
    },
  });
  if (!type || !type.lesson) return null;

  // Progression status. Lessons remain learnable regardless (jump-ahead), but we
  // surface whether this is the guided-path next step or ahead of it.
  const unlocked = type.progress[0]?.unlocked ?? false;
  const mastery = type.progress[0]?.masteryScore ?? 0;
  const mastered = isMastered(mastery, (type.progress[0]?.seenCount ?? 0) > 0 ? 1 : 0);
  const prereqId = prereqOf(typeId);
  let prereqName: string | null = null;
  let prereqMet = !prereqId;
  if (prereqId) {
    const pt = await prisma.ecgType.findUnique({
      where: { id: prereqId },
      include: { progress: { where: { userId: USER_ID } } },
    });
    prereqName = pt?.name ?? null;
    const pp = pt?.progress[0];
    prereqMet = pp ? demonstratedCompetence(pp.seenCount, pp.correctCount, pp.masteryScore) : false;
  }
  const [approvedCount, totalCount] = await Promise.all([
    prisma.question.count({ where: { typeId, reviewStatus: "approved" } }),
    prisma.question.count({ where: { typeId } }),
  ]);
  const pendingReview = approvedCount === 0 && totalCount > 0;

  const status: ProgressStatus = pendingReview
    ? "locked"
    : mastered
      ? "mastered"
      : unlocked
        ? "learning"
        : prereqMet
          ? "available"
          : "locked";
  const loc = TYPE_LOCATION[typeId];
  const available = true;

  const examples: LessonExample[] = type.questions
    .filter((q) => q.record)
    .map((q) => ({
      source: q.record!.source,
      externalId: q.record!.externalId,
      signalsB64: q.record!.signalsB64,
      leadOrder: JSON.parse(q.record!.leads),
      gain: q.record!.gain,
      fs: q.record!.fs,
      nSamples: q.record!.nSamples,
      leadFocus: q.leadFocus,
    }));

  return {
    id: type.id,
    name: type.name,
    shortName: type.shortName,
    summary: type.summary,
    estMinutes: type.lesson.estMinutes,
    sections: JSON.parse(type.lesson.sections),
    keyFacts: JSON.parse(type.lesson.keyFacts),
    unlocked: type.progress[0]?.unlocked ?? false,
    status,
    pendingReview,
    prereqName,
    categoryLabel: loc?.categoryLabel ?? "Other",
    subLabel: loc?.subLabel ?? "",
    available,
    questionCount: approvedCount,
    sampleRecord: examples[0] ?? null,
    examples,
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
