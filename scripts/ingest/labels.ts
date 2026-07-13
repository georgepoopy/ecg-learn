/**
 * Full PTB-XL SCP-statement registry — all 71 codes.
 *
 * Each entry gives a human-readable name, its category (rhythm / form /
 * diagnostic), a best-fit superclass for grouping distractors, a difficulty
 * tier, and a one-line factual descriptor used in explanations. This is the
 * single source of truth that lets every SCP code appear in the bank (as an
 * answer, a distractor, or a "finding present" option), not just the ~dozen
 * common rhythms.
 *
 * Tier assignment is a curation choice (pedagogical ordering), not a clinical
 * fact — see REVIEW.md.
 */

export type Tier = "foundational" | "intermediate" | "advanced" | "expert";
export type Category = "rhythm" | "form" | "diagnostic";

export interface LabelInfo {
  code: string;
  name: string; // human-readable answer label
  category: Category;
  superclass: string; // NORM | MI | STTC | CD | HYP | RHYTHM (grouping)
  tier: Tier;
  /** One-line factual descriptor (used to explain why an option is right/wrong). */
  descriptor: string;
}

export const LABELS: Record<string, LabelInfo> = {
  // ── Normal ────────────────────────────────────────────────────────────────
  NORM: { code: "NORM", name: "Normal ECG", category: "diagnostic", superclass: "NORM", tier: "foundational", descriptor: "no significant abnormality; all intervals and morphology within normal limits" },

  // ── Rhythm ────────────────────────────────────────────────────────────────
  SR: { code: "SR", name: "Sinus rhythm", category: "rhythm", superclass: "RHYTHM", tier: "foundational", descriptor: "upright sinus P before every QRS in lead II, regular, rate 60–100" },
  SBRAD: { code: "SBRAD", name: "Sinus bradycardia", category: "rhythm", superclass: "RHYTHM", tier: "foundational", descriptor: "sinus rhythm with rate < 60 bpm" },
  STACH: { code: "STACH", name: "Sinus tachycardia", category: "rhythm", superclass: "RHYTHM", tier: "foundational", descriptor: "sinus rhythm with rate > 100 bpm" },
  SARRH: { code: "SARRH", name: "Sinus arrhythmia", category: "rhythm", superclass: "RHYTHM", tier: "intermediate", descriptor: "sinus rhythm with beat-to-beat rate variation, often respiratory" },
  AFIB: { code: "AFIB", name: "Atrial fibrillation", category: "rhythm", superclass: "RHYTHM", tier: "foundational", descriptor: "no P waves, irregularly irregular R–R" },
  AFLT: { code: "AFLT", name: "Atrial flutter", category: "rhythm", superclass: "RHYTHM", tier: "intermediate", descriptor: "saw-tooth flutter waves ~300/min, often regular ventricular response" },
  SVTAC: { code: "SVTAC", name: "Supraventricular tachycardia", category: "rhythm", superclass: "RHYTHM", tier: "advanced", descriptor: "narrow-complex tachycardia of supraventricular origin" },
  PSVT: { code: "PSVT", name: "Paroxysmal SVT", category: "rhythm", superclass: "RHYTHM", tier: "advanced", descriptor: "abrupt-onset narrow-complex tachycardia, often re-entrant" },
  SVARR: { code: "SVARR", name: "Supraventricular arrhythmia", category: "rhythm", superclass: "RHYTHM", tier: "advanced", descriptor: "supraventricular irregularity not otherwise specified" },
  PACE: { code: "PACE", name: "Paced rhythm", category: "rhythm", superclass: "RHYTHM", tier: "intermediate", descriptor: "pacing spikes preceding paced P and/or wide QRS complexes" },
  BIGU: { code: "BIGU", name: "Bigeminy", category: "rhythm", superclass: "RHYTHM", tier: "advanced", descriptor: "every other beat is a premature complex" },
  TRIGU: { code: "TRIGU", name: "Trigeminy", category: "rhythm", superclass: "RHYTHM", tier: "advanced", descriptor: "every third beat is a premature complex" },

  // ── Ectopy / premature beats (form) ───────────────────────────────────────
  PVC: { code: "PVC", name: "Ventricular premature complex", category: "form", superclass: "RHYTHM", tier: "intermediate", descriptor: "early wide bizarre QRS, no preceding P, compensatory pause" },
  PAC: { code: "PAC", name: "Atrial premature complex", category: "form", superclass: "RHYTHM", tier: "intermediate", descriptor: "early P wave of abnormal morphology, usually narrow QRS" },
  "PRC(S)": { code: "PRC(S)", name: "Premature complex(es)", category: "form", superclass: "RHYTHM", tier: "intermediate", descriptor: "premature beat(s) present, origin unspecified" },

  // ── Conduction ────────────────────────────────────────────────────────────
  "1AVB": { code: "1AVB", name: "First-degree AV block", category: "diagnostic", superclass: "CD", tier: "intermediate", descriptor: "PR > 200 ms, constant, every P conducts" },
  "2AVB": { code: "2AVB", name: "Second-degree AV block", category: "diagnostic", superclass: "CD", tier: "advanced", descriptor: "intermittent failure of AV conduction (dropped QRS)" },
  "3AVB": { code: "3AVB", name: "Third-degree (complete) AV block", category: "diagnostic", superclass: "CD", tier: "advanced", descriptor: "complete AV dissociation; independent P and QRS rates" },
  CRBBB: { code: "CRBBB", name: "Complete RBBB", category: "diagnostic", superclass: "CD", tier: "intermediate", descriptor: "QRS ≥ 120 ms, rSR′ in V1, wide S in I/V6" },
  IRBBB: { code: "IRBBB", name: "Incomplete RBBB", category: "diagnostic", superclass: "CD", tier: "intermediate", descriptor: "RBBB morphology with QRS 110–120 ms" },
  CLBBB: { code: "CLBBB", name: "Complete LBBB", category: "diagnostic", superclass: "CD", tier: "intermediate", descriptor: "QRS ≥ 120 ms, broad monophasic R in I/V6, QS in V1" },
  ILBBB: { code: "ILBBB", name: "Incomplete LBBB", category: "diagnostic", superclass: "CD", tier: "advanced", descriptor: "LBBB morphology with QRS 110–120 ms" },
  LAFB: { code: "LAFB", name: "Left anterior fascicular block", category: "diagnostic", superclass: "CD", tier: "advanced", descriptor: "marked left-axis deviation, qR in aVL, rS inferiorly" },
  LPFB: { code: "LPFB", name: "Left posterior fascicular block", category: "diagnostic", superclass: "CD", tier: "advanced", descriptor: "right-axis deviation with rS in I/aVL, qR inferiorly (diagnosis of exclusion)" },
  IVCD: { code: "IVCD", name: "Nonspecific intraventricular conduction delay", category: "diagnostic", superclass: "CD", tier: "advanced", descriptor: "wide QRS not meeting RBBB or LBBB criteria" },
  WPW: { code: "WPW", name: "Wolff–Parkinson–White (pre-excitation)", category: "diagnostic", superclass: "CD", tier: "expert", descriptor: "short PR, delta wave, widened QRS from an accessory pathway" },
  LPR: { code: "LPR", name: "Prolonged PR interval", category: "form", superclass: "CD", tier: "intermediate", descriptor: "PR interval longer than normal (borderline/first-degree)" },

  // ── Chambers / hypertrophy ────────────────────────────────────────────────
  LVH: { code: "LVH", name: "Left ventricular hypertrophy", category: "diagnostic", superclass: "HYP", tier: "intermediate", descriptor: "high left-sided QRS voltages ± lateral strain" },
  RVH: { code: "RVH", name: "Right ventricular hypertrophy", category: "diagnostic", superclass: "HYP", tier: "advanced", descriptor: "right-axis deviation, dominant R in V1, right precordial strain" },
  SEHYP: { code: "SEHYP", name: "Septal hypertrophy", category: "diagnostic", superclass: "HYP", tier: "expert", descriptor: "prominent septal forces" },
  VCLVH: { code: "VCLVH", name: "LVH by voltage criteria", category: "form", superclass: "HYP", tier: "intermediate", descriptor: "QRS voltage criteria for LVH met" },
  "LAO/LAE": { code: "LAO/LAE", name: "Left atrial enlargement", category: "diagnostic", superclass: "HYP", tier: "advanced", descriptor: "broad/notched P in II, deep terminal P in V1" },
  "RAO/RAE": { code: "RAO/RAE", name: "Right atrial enlargement", category: "diagnostic", superclass: "HYP", tier: "advanced", descriptor: "tall peaked P waves (P pulmonale) in II" },
  HVOLT: { code: "HVOLT", name: "High QRS voltage", category: "form", superclass: "HYP", tier: "advanced", descriptor: "increased QRS amplitude" },
  LVOLT: { code: "LVOLT", name: "Low QRS voltage", category: "form", superclass: "HYP", tier: "advanced", descriptor: "small QRS amplitudes in limb and precordial leads" },
  ABQRS: { code: "ABQRS", name: "Abnormal QRS", category: "form", superclass: "HYP", tier: "advanced", descriptor: "abnormal QRS morphology, nonspecific" },
  QWAVE: { code: "QWAVE", name: "Pathological Q waves", category: "form", superclass: "MI", tier: "advanced", descriptor: "Q waves suggesting prior infarction" },

  // ── Myocardial infarction (location) ──────────────────────────────────────
  IMI: { code: "IMI", name: "Inferior MI", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "infarct pattern in II, III, aVF (inferior wall)" },
  ILMI: { code: "ILMI", name: "Inferolateral MI", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "infarct pattern inferior + lateral leads" },
  IPMI: { code: "IPMI", name: "Inferoposterior MI", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "inferior + posterior wall infarct pattern" },
  IPLMI: { code: "IPLMI", name: "Inferoposterolateral MI", category: "diagnostic", superclass: "MI", tier: "expert", descriptor: "inferior + posterior + lateral infarct pattern" },
  AMI: { code: "AMI", name: "Anterior MI", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "infarct pattern in V1–V4 (anterior wall)" },
  ASMI: { code: "ASMI", name: "Anteroseptal MI", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "infarct pattern in V1–V2/V3 (anteroseptal)" },
  ALMI: { code: "ALMI", name: "Anterolateral MI", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "infarct pattern anterior + lateral leads" },
  LMI: { code: "LMI", name: "Lateral MI", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "infarct pattern in I, aVL, V5–V6 (lateral wall)" },
  PMI: { code: "PMI", name: "Posterior MI", category: "diagnostic", superclass: "MI", tier: "expert", descriptor: "tall R in V1–V2 with anterior ST depression (posterior wall)" },
  INJAS: { code: "INJAS", name: "Subendocardial injury, anteroseptal", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "acute injury current in anteroseptal leads" },
  INJAL: { code: "INJAL", name: "Subendocardial injury, anterolateral", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "acute injury current in anterolateral leads" },
  INJIN: { code: "INJIN", name: "Subendocardial injury, inferior", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "acute injury current in inferior leads" },
  INJIL: { code: "INJIL", name: "Subendocardial injury, inferolateral", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "acute injury current in inferolateral leads" },
  INJLA: { code: "INJLA", name: "Subendocardial injury, lateral", category: "diagnostic", superclass: "MI", tier: "advanced", descriptor: "acute injury current in lateral leads" },
  ANEUR: { code: "ANEUR", name: "Ventricular aneurysm pattern", category: "diagnostic", superclass: "STTC", tier: "expert", descriptor: "persistent ST elevation with Q waves after old MI" },

  // ── ST/T changes ──────────────────────────────────────────────────────────
  ISC_: { code: "ISC_", name: "Ischemic ST-T changes", category: "diagnostic", superclass: "STTC", tier: "advanced", descriptor: "ST-T changes suggesting ischemia, nonspecific location" },
  ISCAL: { code: "ISCAL", name: "Ischemia, anterolateral", category: "diagnostic", superclass: "STTC", tier: "advanced", descriptor: "ischemic ST-T in anterolateral leads" },
  ISCAS: { code: "ISCAS", name: "Ischemia, anteroseptal", category: "diagnostic", superclass: "STTC", tier: "advanced", descriptor: "ischemic ST-T in anteroseptal leads" },
  ISCAN: { code: "ISCAN", name: "Ischemia, anterior", category: "diagnostic", superclass: "STTC", tier: "advanced", descriptor: "ischemic ST-T in anterior leads" },
  ISCIN: { code: "ISCIN", name: "Ischemia, inferior", category: "diagnostic", superclass: "STTC", tier: "advanced", descriptor: "ischemic ST-T in inferior leads" },
  ISCIL: { code: "ISCIL", name: "Ischemia, inferolateral", category: "diagnostic", superclass: "STTC", tier: "advanced", descriptor: "ischemic ST-T in inferolateral leads" },
  ISCLA: { code: "ISCLA", name: "Ischemia, lateral", category: "diagnostic", superclass: "STTC", tier: "advanced", descriptor: "ischemic ST-T in lateral leads" },
  STD_: { code: "STD_", name: "ST depression", category: "form", superclass: "STTC", tier: "intermediate", descriptor: "ST-segment depression (nonspecific)" },
  STE_: { code: "STE_", name: "ST elevation", category: "form", superclass: "STTC", tier: "intermediate", descriptor: "ST-segment elevation (nonspecific)" },
  NDT: { code: "NDT", name: "Non-diagnostic T abnormalities", category: "diagnostic", superclass: "STTC", tier: "advanced", descriptor: "T-wave abnormalities that are non-diagnostic" },
  NST_: { code: "NST_", name: "Nonspecific ST changes", category: "diagnostic", superclass: "STTC", tier: "intermediate", descriptor: "nonspecific ST-segment changes" },
  NT_: { code: "NT_", name: "Nonspecific T-wave changes", category: "form", superclass: "STTC", tier: "intermediate", descriptor: "nonspecific T-wave changes" },
  TAB_: { code: "TAB_", name: "T-wave abnormality", category: "form", superclass: "STTC", tier: "intermediate", descriptor: "abnormal T waves" },
  INVT: { code: "INVT", name: "Inverted T waves", category: "form", superclass: "STTC", tier: "intermediate", descriptor: "T-wave inversion" },
  LOWT: { code: "LOWT", name: "Low-amplitude T waves", category: "form", superclass: "STTC", tier: "advanced", descriptor: "flattened, low-amplitude T waves" },
  DIG: { code: "DIG", name: "Digitalis effect", category: "diagnostic", superclass: "STTC", tier: "expert", descriptor: "sagging ('scooped') ST depression from digoxin" },
  LNGQT: { code: "LNGQT", name: "Long QT interval", category: "diagnostic", superclass: "STTC", tier: "expert", descriptor: "prolonged QT/QTc interval" },
  EL: { code: "EL", name: "Electrolyte/drug effect", category: "diagnostic", superclass: "STTC", tier: "expert", descriptor: "ST-T changes suggesting electrolyte abnormality or drug effect" },
};

/** Every SCP code known to the registry. */
export const ALL_CODES = Object.keys(LABELS);

export const TIER_RANK: Record<Tier, number> = {
  foundational: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

export function labelName(code: string): string {
  return LABELS[code]?.name ?? code;
}
