/** Curriculum module grouping, keyed by a type's superclass. */

export const MODULE_LABEL: Record<string, string> = {
  NORM: "Foundations",
  RHYTHM: "Rhythm",
  CD: "Conduction",
  HYP: "Chambers & hypertrophy",
  MI: "Ischemia & infarction",
  STTC: "ST/T changes",
};

/** Display order of modules on the curriculum. */
export const MODULE_ORDER = ["NORM", "RHYTHM", "CD", "HYP", "MI", "STTC"];

export function moduleLabel(superclass: string): string {
  return MODULE_LABEL[superclass] ?? "Other";
}

/** Group items (already sorted by `order`) into modules, preserving order. */
export function groupByModule<T extends { superclass: string }>(
  items: T[],
): { superclass: string; label: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    if (!groups.has(it.superclass)) groups.set(it.superclass, []);
    groups.get(it.superclass)!.push(it);
  }
  return MODULE_ORDER.filter((s) => groups.has(s)).map((s) => ({
    superclass: s,
    label: moduleLabel(s),
    items: groups.get(s)!,
  }));
}
