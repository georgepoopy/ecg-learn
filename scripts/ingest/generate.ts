/**
 * Question generator. For each record it emits a small set of varied, non-
 * duplicate questions across several templates:
 *
 *   identify      – name the primary rhythm/diagnosis (foundational→)
 *   which-finding – pick the finding that IS present (multi-label ECGs)
 *   rate          – measure the ventricular rate (verified vs labels)
 *   axis          – determine the frontal-plane QRS axis (verified vs labels)
 *   territory     – localise an infarct to a coronary region
 *   lead          – which lead best shows the characteristic change
 *
 * Every question carries a difficulty tier, the SCP labels present on the
 * record, and an explanation that says why the answer is right AND why each
 * distractor is wrong. Computed answers (rate/axis) are only emitted when they
 * agree with PTB-XL's own labels, so a noisy measurement never becomes a fact.
 */
import { LABELS, labelName, TIER_RANK, type Tier } from "./labels";
import {
  type TypeDef,
  type PtbRow,
  TYPES_BY_ID,
  MI_TERRITORY,
  typeHint,
  typeTier,
} from "./taxonomy";
import {
  type LeadSignals,
  estimateRate,
  estimateAxis,
  axisFromLabel,
} from "./features";

export interface GenOption {
  id: string;
  label: string;
}

export interface GenQuestion {
  kind: string;
  tier: Tier;
  stem: string;
  options: GenOption[];
  correctOptionId: string;
  explanation: string;
  leadFocus: string | null;
  labels: string[]; // SCP codes present on the record
  /** Stable within-record key so we never emit the same question twice. */
  dedupeKey: string;
}

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[], n: number, rng: Rng): T[] {
  return shuffle(arr, rng).slice(0, n);
}

const maxTier = (a: Tier, b: Tier): Tier => (TIER_RANK[a] >= TIER_RANK[b] ? a : b);

/** Turn a correct label + distractor labels into shuffled, id'd options. */
function assemble(correct: string, distractors: string[], rng: Rng) {
  const labels = shuffle([correct, ...distractors], rng);
  const options = labels.map((label, i) => ({ id: String.fromCharCode(97 + i), label }));
  const correctOptionId = options.find((o) => o.label === correct)!.id;
  return { options, correctOptionId };
}

const presentCodes = (row: PtbRow): string[] =>
  Object.keys(row.scp).filter((c) => c in LABELS);

// --- Templates ---------------------------------------------------------------

function tIdentify(type: TypeDef, row: PtbRow, rng: Rng): GenQuestion {
  const distractorTypes = type.confusableWith.map((id) => TYPES_BY_ID[id]).filter(Boolean).slice(0, 3);
  const distractors = distractorTypes.map((d) => d.answerLabel);
  const { options, correctOptionId } = assemble(type.answerLabel, distractors, rng);
  const why = distractorTypes
    .map((d) => `${d.answerLabel} would instead show ${typeHint(d)}`)
    .join("; ");
  return {
    kind: "identify",
    tier: typeTier(type),
    stem: "Identify the primary rhythm or diagnosis shown in this 12-lead ECG.",
    options,
    correctOptionId,
    explanation:
      `Correct — ${type.answerLabel}: ${typeHint(type)}. ` +
      `Why not the others: ${why}.`,
    leadFocus: type.leadFocus ?? null,
    labels: presentCodes(row),
    dedupeKey: "identify",
  };
}

function tWhichFinding(type: TypeDef, row: PtbRow, rng: Rng): GenQuestion | null {
  const own = new Set(type.scpCodes);
  const present = presentCodes(row).filter((c) => c !== "NORM" && c !== "SR");
  if (present.length < 2) return null; // reserve for genuinely multi-label ECGs

  // Correct: a present finding OTHER than the type's own primary label, so this
  // tests recognition of a *concurrent* finding rather than repeating "identify".
  const concurrent = present.filter((c) => !own.has(c));
  if (concurrent.length < 1) return null;
  const correctCode = pick(concurrent, 1, rng)[0];
  const correct = LABELS[correctCode];

  // Distractors: absent labels, prefer same category, avoid same-family synonyms.
  const absent = Object.values(LABELS).filter(
    (l) =>
      !(l.code in row.scp) &&
      l.code !== "NORM" &&
      l.superclass !== "NORM" &&
      // avoid near-synonyms of the correct finding (same superclass + shared 4-char stem)
      !(l.superclass === correct.superclass && l.code.slice(0, 3) === correct.code.slice(0, 3)),
  );
  const sameCat = absent.filter((l) => l.category === correct.category);
  const pool = sameCat.length >= 3 ? sameCat : absent;
  const distractors = pick(pool, 3, rng).map((l) => l.name);
  if (distractors.length < 3) return null;

  const { options, correctOptionId } = assemble(correct.name, distractors, rng);
  return {
    kind: "which-finding",
    tier: maxTier("intermediate", correct.tier),
    stem: "This ECG has several findings. Which of these is present?",
    options,
    correctOptionId,
    explanation:
      `${correct.name} is present — ${correct.descriptor}. ` +
      `The other options are not present on this tracing.`,
    leadFocus: type.leadFocus ?? null,
    labels: presentCodes(row),
    dedupeKey: "which-finding",
  };
}

function tRate(type: TypeDef, row: PtbRow, sig: LeadSignals, rng: Rng): GenQuestion | null {
  const r = estimateRate(sig);
  if (!r.confident || !r.regular) return null; // single-value rate needs a regular rhythm
  const bpm = Math.round(r.bpm / 5) * 5;

  // Cross-check against rate labels; bail on any inconsistency.
  if ("SBRAD" in row.scp && bpm >= 65) return null;
  if ("STACH" in row.scp && bpm <= 95) return null;
  if (("NORM" in row.scp || "SR" in row.scp) &&
      !("SBRAD" in row.scp) && !("STACH" in row.scp) &&
      (bpm < 55 || bpm > 105)) return null;

  const offsets = [-40, -20, 20, 40];
  const distractors = pick(offsets, 3, rng)
    .map((o) => bpm + o)
    .filter((v) => v >= 25 && v <= 210)
    .map((v) => `${v} bpm`);
  const uniq = Array.from(new Set(distractors)).filter((d) => d !== `${bpm} bpm`);
  if (uniq.length < 3) return null;

  const { options, correctOptionId } = assemble(`${bpm} bpm`, uniq.slice(0, 3), rng);
  return {
    kind: "rate",
    tier: "foundational",
    stem: "Approximately what is the ventricular rate?",
    options,
    correctOptionId,
    explanation:
      `≈ ${bpm} bpm, measured from the R–R interval across the 10-second strip ` +
      `(${r.nBeats} beats detected). Normal is 60–100 bpm.`,
    leadFocus: "II",
    labels: presentCodes(row),
    dedupeKey: "rate",
  };
}

function tAxis(type: TypeDef, row: PtbRow, sig: LeadSignals, rng: Rng): GenQuestion | null {
  const a = estimateAxis(sig);
  if (!a.confident) return null;
  const labelAxis = axisFromLabel(row.heartAxis);
  if (labelAxis && labelAxis !== a.axis) return null; // disagree with PTB-XL → don't assert

  const names: Record<string, string> = {
    normal: "Normal axis",
    left: "Left-axis deviation",
    right: "Right-axis deviation",
    extreme: "Extreme axis deviation",
  };
  const correct = names[a.axis];
  const distractors = Object.values(names).filter((n) => n !== correct);
  const { options, correctOptionId } = assemble(correct, distractors, rng);
  return {
    kind: "axis",
    tier: a.axis === "normal" ? "intermediate" : "advanced",
    stem: "What is the frontal-plane QRS axis?",
    options,
    correctOptionId,
    explanation:
      `Lead I net QRS is ${a.netI >= 0 ? "positive" : "negative"} and aVF net QRS is ` +
      `${a.netAVF >= 0 ? "positive" : "negative"} → ${correct.toLowerCase()}. ` +
      `(Normal axis: I and aVF both positive.)`,
    leadFocus: "I",
    labels: presentCodes(row),
    dedupeKey: "axis",
  };
}

function tTerritory(type: TypeDef, row: PtbRow, rng: Rng): GenQuestion | null {
  // Only ask territory on infarction-type records, where the MI is the salient
  // finding (avoids attaching an "infarct territory" question to, say, a sinus
  // bradycardia tracing that merely carries an old MI label).
  if (type.superclass !== "MI") return null;
  const miCode = Object.keys(row.scp).find((c) => c in MI_TERRITORY);
  if (!miCode) return null;
  const correct = MI_TERRITORY[miCode];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const allTerr = ["inferior", "anterior", "anteroseptal", "lateral", "posterior"];
  const distractors = pick(allTerr.filter((t) => t !== correct), 3, rng).map(cap);
  if (distractors.length < 3) return null;

  const leadMap: Record<string, string> = {
    inferior: "II, III, aVF",
    anterior: "V1–V4",
    anteroseptal: "V1–V2/V3",
    anterolateral: "V3–V6, I, aVL",
    lateral: "I, aVL, V5–V6",
    inferolateral: "II, III, aVF + V5–V6",
    posterior: "tall R in V1–V2 with reciprocal change",
  };
  const { options, correctOptionId } = assemble(cap(correct), distractors, rng);
  return {
    kind: "territory",
    tier: "advanced",
    stem: "The infarct pattern here localises to which region?",
    options,
    correctOptionId,
    explanation:
      `The ${correct} territory is indicated (leads ${leadMap[correct] ?? "the corresponding group"}). ` +
      `Each region maps to a characteristic lead group.`,
    leadFocus: type.leadFocus ?? null,
    labels: presentCodes(row),
    dedupeKey: "territory",
  };
}

function tLead(type: TypeDef, row: PtbRow, rng: Rng): GenQuestion | null {
  if (!type.leadFocus) return null;
  const correct = type.leadFocus;
  const allLeads = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
  const distractors = pick(allLeads.filter((l) => l !== correct), 3, rng);
  const { options, correctOptionId } = assemble(correct, distractors, rng);
  return {
    kind: "lead",
    tier: "intermediate",
    stem: `${type.name}: in which lead is the characteristic change best seen?`,
    options,
    correctOptionId,
    explanation:
      `Lead ${correct} best demonstrates ${type.name.toLowerCase()} — ${typeHint(type)}.`,
    leadFocus: correct,
    labels: presentCodes(row),
    dedupeKey: "lead",
  };
}

/**
 * Generate the candidate question set for one record. The orchestrator decides
 * how many of each kind to keep (for balance); this just offers what's valid.
 */
export function generateForRecord(
  type: TypeDef,
  row: PtbRow,
  sig: LeadSignals,
  rng: Rng,
): GenQuestion[] {
  const out: (GenQuestion | null)[] = [
    tIdentify(type, row, rng),
    tWhichFinding(type, row, rng),
    tRate(type, row, sig, rng),
    tAxis(type, row, sig, rng),
    tTerritory(type, row, rng),
    tLead(type, row, rng),
  ];
  return out.filter((q): q is GenQuestion => q !== null);
}
