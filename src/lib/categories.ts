/**
 * The category tree + sequential-progression logic.
 *
 * Types are organised into Category → Subcategory → ordered types. A flat DFS of
 * the tree gives the guided **progression sequence**: each type's prerequisite is
 * the previous type in that sequence. A type becomes "available" to learn once
 * you've **demonstrated competence** on its prerequisite; mastering it unlocks the
 * next. Newly unlocked types join the cumulative interleaved bank.
 *
 * The gate is soft: the map/library shows what's locked, but users can always
 * "jump ahead" and learn any type self-paced (see the progression UI).
 */

export interface SubCategory {
  id: string;
  label: string;
  typeIds: string[]; // ordered within the subcategory
}
export interface Category {
  id: string;
  label: string;
  blurb: string;
  subs: SubCategory[];
}

export const CATEGORY_TREE: Category[] = [
  {
    id: "foundations",
    label: "Foundations",
    blurb: "The normal 12-lead baseline.",
    subs: [{ id: "normal", label: "Normal", typeIds: ["sinus-rhythm"] }],
  },
  {
    id: "rate-rhythm",
    label: "Rate & Rhythm",
    blurb: "Sinus variants, atrial rhythms, and ectopy.",
    subs: [
      { id: "sinus", label: "Sinus variants", typeIds: ["sinus-bradycardia", "sinus-tachycardia", "sinus-arrhythmia"] },
      { id: "atrial", label: "Atrial rhythms", typeIds: ["atrial-fibrillation", "atrial-flutter", "pac"] },
      { id: "vent-ectopy", label: "Ventricular ectopy", typeIds: ["pvc"] },
      { id: "paced", label: "Paced rhythm", typeIds: ["paced"] },
    ],
  },
  {
    id: "conduction",
    label: "Conduction",
    blurb: "AV blocks, bundle & fascicular blocks, pre-excitation.",
    subs: [
      { id: "av-blocks", label: "AV blocks", typeIds: ["first-degree-av-block", "second-degree-av-block", "third-degree-av-block"] },
      { id: "bbb", label: "Bundle branch blocks", typeIds: ["rbbb", "lbbb"] },
      { id: "fascicular", label: "Fascicular blocks", typeIds: ["lafb"] },
      { id: "preexcitation", label: "Pre-excitation", typeIds: ["wpw"] },
    ],
  },
  {
    id: "chambers",
    label: "Chambers & Hypertrophy",
    blurb: "Ventricular hypertrophy and atrial enlargement.",
    subs: [
      { id: "ventricular-hyp", label: "Ventricular hypertrophy", typeIds: ["lvh", "rvh"] },
      { id: "atrial-enlarge", label: "Atrial enlargement", typeIds: ["lae"] },
    ],
  },
  {
    id: "ischaemia",
    label: "Ischaemia & Infarction",
    blurb: "ST–T changes through to territorial STEMI.",
    subs: [
      { id: "st-t", label: "ST–T changes", typeIds: ["ischemic-st-t"] },
      { id: "stemi", label: "STEMI", typeIds: ["stemi"] },
    ],
  },
  {
    id: "repolarisation",
    label: "Repolarisation",
    blurb: "QT-interval abnormalities.",
    subs: [{ id: "long-qt", label: "QT abnormalities", typeIds: ["long-qt"] }],
  },
  {
    id: "expert",
    label: "Expert patterns",
    blurb: "Can't-miss diagnoses (authored — pending clinician sign-off).",
    subs: [{ id: "expert-patterns", label: "Can't-miss patterns", typeIds: ["brugada", "wellens", "de-winter", "hyperkalemia"] }],
  },
];

/** Guided progression order (DFS of the tree). */
export const SEQUENCE: string[] = CATEGORY_TREE.flatMap((c) => c.subs.flatMap((s) => s.typeIds));

/** The prerequisite type (previous in the sequence), or null for the first. */
export function prereqOf(typeId: string): string | null {
  const i = SEQUENCE.indexOf(typeId);
  return i > 0 ? SEQUENCE[i - 1] : null;
}

export interface TypeLocation {
  categoryId: string;
  categoryLabel: string;
  subId: string;
  subLabel: string;
}

export const TYPE_LOCATION: Record<string, TypeLocation> = (() => {
  const map: Record<string, TypeLocation> = {};
  for (const c of CATEGORY_TREE) {
    for (const s of c.subs) {
      for (const id of s.typeIds) {
        map[id] = { categoryId: c.id, categoryLabel: c.label, subId: s.id, subLabel: s.label };
      }
    }
  }
  return map;
})();

/**
 * Have we "demonstrated competence" on a type — enough to unlock the next?
 * Reached either by a decent mastery score, or by answering a handful of its
 * questions with good accuracy in-session (so progression doesn't require days
 * of FSRS interval growth).
 */
export function demonstratedCompetence(seen: number, correct: number, mastery: number): boolean {
  const acc = seen > 0 ? correct / seen : 0;
  return mastery >= 0.5 || (seen >= 6 && acc >= 0.67);
}

export type ProgressStatus = "mastered" | "learning" | "available" | "locked";

/** Group a flat list of items (with `id`) into the category tree, tree-ordered. */
export function groupByCategory<T extends { id: string }>(items: T[]) {
  const byId = new Map(items.map((i) => [i.id, i]));
  return CATEGORY_TREE.map((c) => ({
    id: c.id,
    label: c.label,
    blurb: c.blurb,
    subs: c.subs.map((s) => ({
      id: s.id,
      label: s.label,
      items: s.typeIds.map((id) => byId.get(id)).filter((x): x is T => Boolean(x)),
    })),
  }));
}
