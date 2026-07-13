/**
 * Curated ECG taxonomy: maps PTB-XL SCP codes to human-readable, teachable ECG
 * types, and holds the ORIGINALLY-AUTHORED lesson content + question templates.
 *
 * Nothing here is scraped. Lesson facts are standard, settled ECG criteria
 * (rate/rhythm/interval/morphology). Anything ambiguous is flagged in REVIEW.md
 * rather than asserted.
 *
 * Types are grouped into modules by `superclass`:
 *   NORM (Foundations) · RHYTHM · CD (Conduction) · HYP (Chambers) · MI (Ischemia)
 */

import { LABELS, type Tier } from "./labels";

/** PTB-XL scp_codes is a map { CODE: likelihood(0..100) }. */
export type ScpMap = Record<string, number>;

/** Selected fields from a ptbxl_database.csv row that selection logic needs. */
export interface PtbRow {
  ecgId: number;
  scp: ScpMap;
  filenameHr: string;
  report: string;
  infarctionStadium1: string;
  heartAxis: string;
}

export interface LessonSection {
  heading: string;
  body: string;
}

export interface LessonContent {
  estMinutes: number;
  sections: LessonSection[];
  keyFacts: string[];
}

export interface TypeDef {
  id: string;
  name: string;
  shortName: string;
  /** NORM | RHYTHM | CD | MI | STTC | HYP */
  superclass: string;
  scpCodes: string[];
  order: number;
  summary: string;
  answerLabel: string;
  confusableWith: string[];
  leadFocus?: string;
  /** Difficulty tier for this type's identify questions (default from label). */
  tier?: Tier;
  /** One-line "why this and not that" hint used when this type is a distractor. */
  distractorHint?: string;
  match: (row: PtbRow) => boolean;
  lesson: LessonContent;
}

/** Representative SCP code for a type (drives tier/descriptor lookups). */
export function primaryCode(t: TypeDef): string {
  return t.scpCodes[0];
}

/** Effective difficulty tier for a type. */
export function typeTier(t: TypeDef): Tier {
  return t.tier ?? LABELS[primaryCode(t)]?.tier ?? "intermediate";
}

/** Short factual "why not" phrase for using a type as a distractor. */
export function typeHint(t: TypeDef): string {
  return t.distractorHint ?? LABELS[primaryCode(t)]?.descriptor ?? t.name;
}

// --- Diagnostic-class code groups -------------------------------------------

/** Primary rhythm statements — used to keep rhythm examples mutually exclusive. */
export const PRIMARY_RHYTHM = [
  "SR", "SBRAD", "STACH", "SARRH", "AFIB", "AFLT", "SVARR", "SVTAC", "PSVT", "PACE",
];

/** Rhythm codes other than plain sinus rhythm — presence means "not clean SR". */
export const NON_SINUS_RHYTHM = [
  "AFIB", "AFLT", "STACH", "SBRAD", "SARRH", "SVARR", "SVTAC", "PSVT",
  "BIGU", "TRIGU", "PACE", "PVC", "PAC", "PRC(S)",
];

/** All abnormal *diagnostic* subclass codes (MI / STTC / CD / HYP). */
export const ABNORMAL_DIAGNOSTIC = [
  "IMI", "ASMI", "ILMI", "AMI", "ALMI", "INJAS", "LMI", "IPLMI", "IPMI",
  "INJAL", "INJIN", "INJLA", "PMI", "INJIL", "ANEUR",
  "NDT", "NST_", "DIG", "LNGQT", "ISC_", "ISCAL", "ISCIN", "ISCIL", "ISCAS",
  "ISCLA", "ISCAN", "STD_", "STE_", "TAB_", "INVT", "LOWT", "NT_", "EL",
  "LAFB", "IRBBB", "CRBBB", "CLBBB", "ILBBB", "LPFB", "IVCD", "WPW", "3AVB",
  "2AVB", "1AVB",
  "LVH", "RVH", "LAO/LAE", "RAO/RAE", "SEHYP", "VCLVH", "HVOLT", "LVOLT",
];

export const MI_CODES = [
  "IMI", "ASMI", "ILMI", "AMI", "ALMI", "LMI", "IPLMI", "IPMI", "PMI",
];
export const INJURY_CODES = ["INJAS", "INJAL", "INJIN", "INJLA", "INJIL", "STE_"];
export const ACUTE_STADIA = new Set(["Stadium I", "Stadium I-II", "Stadium II"]);

const has = (row: PtbRow, code: string) => code in row.scp;
const hasAny = (row: PtbRow, codes: string[]) => codes.some((c) => c in row.scp);
const isAcuteMi = (row: PtbRow) => ACUTE_STADIA.has(row.infarctionStadium1);

// --- The curated types -------------------------------------------------------

export const TYPES: TypeDef[] = [
  // ── Foundations ──────────────────────────────────────────────────────────
  {
    id: "sinus-rhythm",
    name: "Normal sinus rhythm",
    shortName: "NSR",
    superclass: "NORM",
    scpCodes: ["SR", "NORM"],
    order: 1,
    summary: "The healthy baseline: SA-node rhythm, everything in range.",
    answerLabel: "Normal sinus rhythm",
    confusableWith: ["sinus-bradycardia", "sinus-tachycardia", "atrial-fibrillation"],
    leadFocus: "II",
    match: (row) =>
      has(row, "SR") &&
      (row.scp["NORM"] ?? 0) >= 80 &&
      !hasAny(row, ABNORMAL_DIAGNOSTIC) &&
      !hasAny(row, NON_SINUS_RHYTHM),
    lesson: {
      estMinutes: 4,
      sections: [
        {
          heading: "What it is",
          body:
            "Normal sinus rhythm is the heart's default: each beat starts in the " +
            "sinoatrial (SA) node, spreads through the atria, pauses at the AV node, " +
            "then activates the ventricles. On the ECG this produces a repeating, " +
            "regular P–QRS–T sequence.",
        },
        {
          heading: "How to recognise it",
          body:
            "Confirm four things: (1) a rate of 60–100 bpm, (2) regular R–R " +
            "intervals, (3) one upright P wave before every QRS in lead II, and " +
            "(4) normal intervals — PR 120–200 ms and QRS under 120 ms.",
        },
        {
          heading: "Why the P wave in lead II matters",
          body:
            "Lead II runs roughly parallel to normal atrial depolarisation, so a " +
            "sinus P wave is reliably upright there. An absent or inverted P wave in " +
            "lead II is your first clue that the rhythm is not sinus.",
        },
      ],
      keyFacts: [
        "Rate 60–100 bpm",
        "Regular R–R intervals",
        "Upright P wave before every QRS in lead II",
        "PR interval 120–200 ms",
        "QRS duration < 120 ms",
      ],
    },
  },

  // ── Rhythm ───────────────────────────────────────────────────────────────
  {
    id: "sinus-bradycardia",
    name: "Sinus bradycardia",
    shortName: "S.Brady",
    superclass: "RHYTHM",
    scpCodes: ["SBRAD"],
    order: 2,
    summary: "Sinus rhythm, just slow — under 60 bpm.",
    answerLabel: "Sinus bradycardia",
    confusableWith: ["sinus-rhythm", "sinus-tachycardia", "first-degree-av-block"],
    leadFocus: "II",
    match: (row) => has(row, "SBRAD") && !hasAny(row, ["AFIB", "AFLT", "STACH", "PACE", "2AVB", "3AVB"]),
    lesson: {
      estMinutes: 3,
      sections: [
        {
          heading: "What it is",
          body:
            "Sinus bradycardia is a normal sinus rhythm running slower than 60 bpm. " +
            "The impulse still originates in the SA node and conducts normally — " +
            "there are just fewer beats per minute.",
        },
        {
          heading: "How to recognise it",
          body:
            "Every QRS is preceded by an upright sinus P wave in lead II, the rhythm " +
            "is regular, intervals are normal, and the rate is below 60. The only " +
            "difference from normal sinus rhythm is the slower rate.",
        },
        {
          heading: "Context",
          body:
            "It is often benign — common in athletes and during sleep — but can also " +
            "result from medications (beta-blockers), high vagal tone, or sinus-node " +
            "disease. The ECG pattern is the same regardless of cause.",
        },
      ],
      keyFacts: [
        "Rate < 60 bpm",
        "Upright sinus P wave before every QRS in lead II",
        "Regular R–R intervals",
        "Normal PR and QRS — only the rate is abnormal",
      ],
    },
  },
  {
    id: "sinus-tachycardia",
    name: "Sinus tachycardia",
    shortName: "S.Tachy",
    superclass: "RHYTHM",
    scpCodes: ["STACH"],
    order: 3,
    summary: "Sinus rhythm, sped up — over 100 bpm.",
    answerLabel: "Sinus tachycardia",
    confusableWith: ["sinus-rhythm", "sinus-bradycardia", "atrial-fibrillation"],
    leadFocus: "II",
    match: (row) => has(row, "STACH") && !hasAny(row, ["AFIB", "AFLT", "SBRAD", "PACE", "2AVB", "3AVB"]),
    lesson: {
      estMinutes: 3,
      sections: [
        {
          heading: "What it is",
          body:
            "Sinus tachycardia is a normal sinus rhythm faster than 100 bpm. It is " +
            "almost always a response to a physiological demand — fever, exertion, " +
            "pain, anxiety, dehydration, or anaemia — rather than a primary rhythm " +
            "problem.",
        },
        {
          heading: "How to recognise it",
          body:
            "Look for an upright sinus P wave before every QRS in lead II, a regular " +
            "rhythm, and a rate above 100. At faster rates the P wave can blend into " +
            "the preceding T wave, so inspect the T–P segment carefully.",
        },
        {
          heading: "Distinguishing it",
          body:
            "Onset and offset are gradual, and the rate tracks the underlying cause. " +
            "This contrasts with re-entrant supraventricular tachycardias, which " +
            "start and stop abruptly and are typically faster and P-wave-less.",
        },
      ],
      keyFacts: [
        "Rate > 100 bpm",
        "Upright sinus P wave before every QRS in lead II",
        "Regular rhythm with gradual onset/offset",
        "Usually secondary to a physiological stressor",
      ],
    },
  },
  {
    id: "atrial-fibrillation",
    name: "Atrial fibrillation",
    shortName: "AF",
    superclass: "RHYTHM",
    scpCodes: ["AFIB"],
    order: 4,
    summary: "Irregularly irregular, with no true P waves.",
    answerLabel: "Atrial fibrillation",
    confusableWith: ["atrial-flutter", "sinus-rhythm", "sinus-tachycardia"],
    leadFocus: "II",
    match: (row) => has(row, "AFIB") && !has(row, "AFLT"),
    lesson: {
      estMinutes: 4,
      sections: [
        {
          heading: "What it is",
          body:
            "In atrial fibrillation the atria depolarise chaotically at 300–600 " +
            "impulses per minute instead of firing once per beat. The AV node passes " +
            "these impulses through unpredictably, so the ventricles respond at " +
            "irregular intervals.",
        },
        {
          heading: "How to recognise it",
          body:
            "Two features define it: there are no discrete P waves — the baseline is " +
            "flat or shows fine/coarse fibrillatory waves — and the R–R intervals are " +
            "irregularly irregular, following no repeating pattern. The QRS complexes " +
            "are usually normal in width.",
        },
        {
          heading: "Rate vs. rhythm",
          body:
            "The ventricular rate can be slow, normal, or fast; rate does not define " +
            "AF. What defines it is the absence of organised atrial activity plus the " +
            "irregular ventricular response.",
        },
      ],
      keyFacts: [
        "No discrete P waves (fibrillatory or flat baseline)",
        "Irregularly irregular R–R intervals",
        "QRS usually normal width",
        "Ventricular rate is variable and does not define the diagnosis",
      ],
    },
  },
  {
    id: "atrial-flutter",
    name: "Atrial flutter",
    shortName: "Flutter",
    superclass: "RHYTHM",
    scpCodes: ["AFLT"],
    order: 5,
    summary: "Organised saw-tooth flutter waves at ~300/min.",
    answerLabel: "Atrial flutter",
    confusableWith: ["atrial-fibrillation", "sinus-tachycardia", "sinus-rhythm"],
    leadFocus: "II",
    match: (row) => has(row, "AFLT"),
    lesson: {
      estMinutes: 4,
      sections: [
        {
          heading: "What it is",
          body:
            "Atrial flutter is an organised re-entrant circuit in the atria, usually " +
            "cycling around the right atrium at about 250–350 bpm. Because it is " +
            "organised (unlike fibrillation), it produces uniform, repeating atrial " +
            "waves.",
        },
        {
          heading: "How to recognise it",
          body:
            "Look for a saw-tooth baseline of flutter (F) waves, classically negative " +
            "and best seen in the inferior leads II, III and aVF. The AV node conducts " +
            "only a fraction of the impulses, often at a fixed ratio (2:1, 3:1), so " +
            "the ventricular rate is frequently regular — a 2:1 block gives the " +
            "characteristic ~150 bpm.",
        },
        {
          heading: "Flutter vs. fibrillation",
          body:
            "Flutter is organised and often regular with visible saw-tooth waves; " +
            "fibrillation is chaotic and irregularly irregular with no discrete atrial " +
            "waves. When the ventricular rate is a suspiciously steady ~150, look hard " +
            "for hidden flutter waves.",
        },
      ],
      keyFacts: [
        "Saw-tooth flutter (F) waves, best seen in II, III, aVF",
        "Atrial rate ~250–350 bpm",
        "Often a regular ventricular response at a fixed ratio (e.g. 2:1 ≈ 150 bpm)",
        "More organised than atrial fibrillation",
      ],
    },
  },
  {
    id: "pvc",
    name: "Ventricular premature complexes",
    shortName: "PVC",
    superclass: "RHYTHM",
    scpCodes: ["PVC"],
    order: 6,
    summary: "Early, wide, bizarre beats from a ventricular focus.",
    answerLabel: "Ventricular premature complex(es)",
    confusableWith: ["atrial-fibrillation", "atrial-flutter", "sinus-rhythm"],
    leadFocus: "II",
    match: (row) => has(row, "PVC") && !hasAny(row, ["AFIB", "AFLT", "PACE"]),
    lesson: {
      estMinutes: 4,
      sections: [
        {
          heading: "What it is",
          body:
            "A ventricular premature complex (PVC) is an extra beat arising from an " +
            "ectopic focus in the ventricles. Because it bypasses the normal " +
            "conduction system, it depolarises the ventricles slowly and abnormally.",
        },
        {
          heading: "How to recognise it",
          body:
            "Find a QRS that comes early and looks wide and bizarre compared with the " +
            "patient's normal beats. It is not preceded by a P wave, its T wave points " +
            "opposite to the QRS, and it is usually followed by a compensatory pause " +
            "before the underlying rhythm resumes.",
        },
        {
          heading: "What to note",
          body:
            "PVCs are ectopic beats superimposed on an underlying rhythm, not a " +
            "sustained rhythm in themselves. Isolated PVCs are common and often " +
            "benign; describing their frequency and pattern (e.g. bigeminy) is part " +
            "of a full read.",
        },
      ],
      keyFacts: [
        "Premature, wide (> 120 ms), bizarre QRS",
        "No preceding P wave",
        "T wave opposite in direction to the QRS",
        "Often followed by a compensatory pause",
        "Underlying rhythm is otherwise intact",
      ],
    },
  },

  // ── Conduction ───────────────────────────────────────────────────────────
  {
    id: "first-degree-av-block",
    name: "First-degree AV block",
    shortName: "1° AVB",
    superclass: "CD",
    scpCodes: ["1AVB"],
    order: 7,
    summary: "Every beat conducts, but the PR interval is long.",
    answerLabel: "First-degree AV block",
    confusableWith: ["sinus-rhythm", "rbbb", "lbbb"],
    leadFocus: "II",
    match: (row) =>
      has(row, "1AVB") &&
      !has(row, "2AVB") &&
      !has(row, "3AVB") &&
      !hasAny(row, ["AFIB", "AFLT"]),
    lesson: {
      estMinutes: 4,
      sections: [
        {
          heading: "What it is",
          body:
            "First-degree AV block is delayed — not blocked — conduction through the " +
            "AV node. Every atrial impulse still reaches the ventricles, but each one " +
            "takes longer than normal to get there.",
        },
        {
          heading: "How to recognise it",
          body:
            "Measure the PR interval (start of P to start of QRS). If it is " +
            "consistently longer than 200 ms (one large square) and every P wave is " +
            "still followed by a QRS, it is first-degree AV block. The PR stays " +
            "constant beat to beat — nothing is dropped.",
        },
        {
          heading: "Why it is 'first-degree'",
          body:
            "First-degree is pure delay with 1:1 conduction. Second-degree drops some " +
            "beats; third-degree is complete dissociation. A long but constant PR with " +
            "no dropped beats places it firmly at first-degree.",
        },
      ],
      keyFacts: [
        "PR interval > 200 ms",
        "PR interval constant from beat to beat",
        "Every P wave is followed by a QRS (1:1 conduction)",
        "Usually incidental on an otherwise sinus tracing",
      ],
    },
  },
  {
    id: "rbbb",
    name: "Right bundle branch block",
    shortName: "RBBB",
    superclass: "CD",
    scpCodes: ["CRBBB"],
    order: 8,
    summary: "Wide QRS with 'rabbit-ear' rSR′ in V1.",
    answerLabel: "Right bundle branch block",
    confusableWith: ["lbbb", "lafb", "first-degree-av-block"],
    leadFocus: "V1",
    match: (row) =>
      has(row, "CRBBB") && !has(row, "CLBBB") && !hasAny(row, ["AFIB", "AFLT"]) && !isAcuteMi(row),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "In right bundle branch block the right bundle fails to conduct, so the " +
            "right ventricle is activated late and slowly through ordinary myocardium " +
            "after the left ventricle. This widens and distorts the terminal QRS.",
        },
        {
          heading: "How to recognise it",
          body:
            "Three things together: a QRS of 120 ms or more; an rSR′ (‘M-shaped’, " +
            "‘rabbit-ear’) complex in V1–V2; and a wide, slurred S wave in the lateral " +
            "leads I and V6. Secondary T-wave inversion in the right precordial leads " +
            "is expected and does not by itself indicate ischaemia.",
        },
        {
          heading: "Why V1 is the key lead",
          body:
            "V1 sits over the right ventricle, so the late right-ventricular activation " +
            "shows up there as the characteristic second R wave (R′). Reading V1 first " +
            "is the quickest way to spot RBBB.",
        },
      ],
      keyFacts: [
        "QRS ≥ 120 ms",
        "rSR′ (‘rabbit-ear’) pattern in V1–V2",
        "Wide, slurred S wave in leads I and V6",
        "Secondary T-wave inversion in right precordial leads",
      ],
    },
  },
  {
    id: "lbbb",
    name: "Left bundle branch block",
    shortName: "LBBB",
    superclass: "CD",
    scpCodes: ["CLBBB"],
    order: 9,
    summary: "Wide QRS with broad monophasic R in I/V6.",
    answerLabel: "Left bundle branch block",
    confusableWith: ["rbbb", "lafb", "stemi"],
    leadFocus: "V6",
    match: (row) =>
      has(row, "CLBBB") && !has(row, "CRBBB") && !hasAny(row, ["AFIB", "AFLT"]) && !isAcuteMi(row),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "In left bundle branch block the left bundle fails, so the left ventricle " +
            "is activated late and abnormally across the septum from the right. This " +
            "reverses septal activation and broadens the whole QRS.",
        },
        {
          heading: "How to recognise it",
          body:
            "Look for a QRS of 120 ms or more with a broad, notched or monophasic R " +
            "wave in the lateral leads I, aVL, V5 and V6, and a dominant downward " +
            "deflection (QS or rS) in V1. The normal small septal Q waves are lost, and " +
            "the ST segments and T waves point opposite to the main QRS deflection " +
            "(appropriate discordance).",
        },
        {
          heading: "A crucial caveat",
          body:
            "LBBB changes the QRS and ST-T so much that it can mask or mimic an acute " +
            "myocardial infarction. A new LBBB in the right clinical setting is treated " +
            "seriously. This module teaches the LBBB pattern only — never rule an MI in " +
            "or out from the ECG alone.",
        },
      ],
      keyFacts: [
        "QRS ≥ 120 ms",
        "Broad, notched/monophasic R wave in I, aVL, V5–V6",
        "Dominant S (QS or rS) in V1",
        "Loss of normal septal Q waves",
        "ST/T changes discordant to the QRS",
      ],
    },
  },
  {
    id: "lafb",
    name: "Left anterior fascicular block",
    shortName: "LAFB",
    superclass: "CD",
    scpCodes: ["LAFB"],
    order: 10,
    summary: "Marked left-axis deviation from a blocked fascicle.",
    answerLabel: "Left anterior fascicular block",
    confusableWith: ["rbbb", "lbbb", "lvh"],
    leadFocus: "aVL",
    match: (row) =>
      has(row, "LAFB") && !has(row, "CLBBB") && !hasAny(row, ["AFIB", "AFLT"]) && !isAcuteMi(row),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "The left bundle splits into an anterior and a posterior fascicle. When " +
            "the anterior fascicle is blocked, the left ventricle is activated in an " +
            "altered sequence that swings the QRS axis sharply to the left.",
        },
        {
          heading: "How to recognise it",
          body:
            "The hallmark is marked left-axis deviation (roughly −45° to −90°): the " +
            "QRS is positive in I and aVL but negative in II, III and aVF. Look for a " +
            "small q with a tall R (qR) in aVL and an rS pattern in the inferior leads. " +
            "Unlike a bundle branch block, the QRS is only minimally widened.",
        },
        {
          heading: "How it differs from LBBB",
          body:
            "LAFB shifts the axis but keeps the QRS narrow-ish; LBBB broadens the QRS " +
            "beyond 120 ms with lateral notched R waves. Axis is the quickest " +
            "discriminator.",
        },
      ],
      keyFacts: [
        "Marked left-axis deviation (≈ −45° to −90°)",
        "qR pattern in I and aVL",
        "rS pattern in II, III, aVF",
        "QRS duration < 120 ms (or only slightly prolonged)",
      ],
    },
  },

  // ── Chambers ─────────────────────────────────────────────────────────────
  {
    id: "lvh",
    name: "Left ventricular hypertrophy",
    shortName: "LVH",
    superclass: "HYP",
    scpCodes: ["LVH"],
    order: 11,
    summary: "Tall QRS voltages, often with lateral strain.",
    answerLabel: "Left ventricular hypertrophy",
    confusableWith: ["lbbb", "lafb", "sinus-rhythm"],
    leadFocus: "V5",
    match: (row) =>
      has(row, "LVH") && !has(row, "CLBBB") && !hasAny(row, ["AFIB", "AFLT"]) && !isAcuteMi(row),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "Left ventricular hypertrophy is thickened left-ventricular muscle, " +
            "usually from chronic pressure load such as hypertension or aortic " +
            "stenosis. More muscle generates larger electrical forces, so the QRS " +
            "voltages grow.",
        },
        {
          heading: "How to recognise it",
          body:
            "Voltage criteria are the core clue. Common ones: the sum of the S wave in " +
            "V1 and the R wave in V5 or V6 exceeding 35 mm (Sokolow–Lyon), or an R wave " +
            "in aVL taller than 11 mm. Advanced LVH often adds a left-axis shift and a " +
            "‘strain’ pattern — down-sloping ST depression and T-wave inversion in the " +
            "lateral leads I, aVL, V5 and V6.",
        },
        {
          heading: "A word of caution",
          body:
            "Several different voltage criteria exist and they trade sensitivity for " +
            "specificity; tall voltages can also occur in thin, healthy young people. " +
            "Voltage alone is suggestive, not diagnostic.",
        },
      ],
      keyFacts: [
        "High QRS voltages (e.g. S in V1 + R in V5/V6 > 35 mm; R in aVL > 11 mm)",
        "Often left-axis deviation",
        "Lateral ‘strain’: ST depression / T inversion in I, aVL, V5–V6",
        "Voltage criteria are suggestive, not definitive",
      ],
    },
  },

  // ── Ischemia ─────────────────────────────────────────────────────────────
  {
    id: "stemi",
    name: "ST-elevation myocardial infarction (pattern)",
    shortName: "STEMI",
    superclass: "MI",
    scpCodes: [...MI_CODES, ...INJURY_CODES],
    order: 12,
    summary: "Territorial ST elevation — an acute-injury pattern.",
    answerLabel: "ST-elevation MI (STEMI) pattern",
    confusableWith: ["lbbb", "sinus-rhythm", "lvh"],
    tier: "advanced",
    distractorHint: "territorial ST elevation in ≥2 contiguous leads (acute injury)",
    match: (row) => isAcuteMi(row) && hasAny(row, [...MI_CODES, ...INJURY_CODES]),
    lesson: {
      estMinutes: 6,
      sections: [
        {
          heading: "What it is",
          body:
            "An ST-elevation myocardial infarction reflects acute, full-thickness " +
            "ischaemia of a region of myocardium, usually from an occluded coronary " +
            "artery. The injured tissue shifts the ST segment upward in the leads " +
            "that face it.",
        },
        {
          heading: "How to recognise the pattern",
          body:
            "Look for ST-segment elevation in two or more anatomically contiguous " +
            "leads, often with reciprocal ST depression in the opposing leads. Early " +
            "on the T waves may be tall and broad (‘hyperacute’); over hours to days " +
            "the ST elevation settles and pathological Q waves can appear.",
        },
        {
          heading: "Localising the territory",
          body:
            "The leads showing elevation point to the culprit region: II, III and " +
            "aVF for inferior; V1–V4 for anteroseptal/anterior; I, aVL, V5–V6 for " +
            "lateral. Recognising the territory is a core skill, but the diagnosis of " +
            "an acute STEMI is always clinical — this tool teaches the pattern only.",
        },
      ],
      keyFacts: [
        "ST-segment elevation in ≥2 contiguous leads",
        "Reciprocal ST depression may be present in opposite leads",
        "Distribution is regional/territorial (inferior, anterior, lateral)",
        "Hyperacute T waves early; pathological Q waves evolve later",
        "Diagnosis of acute STEMI is clinical — the ECG shows the pattern",
      ],
    },
  },

  // ── Additional data-backed types (round 2 expansion) ─────────────────────
  {
    id: "sinus-arrhythmia",
    name: "Sinus arrhythmia",
    shortName: "S.Arrh",
    superclass: "RHYTHM",
    scpCodes: ["SARRH"],
    order: 13,
    summary: "Sinus rhythm that speeds up and slows with breathing.",
    answerLabel: "Sinus arrhythmia",
    confusableWith: ["sinus-rhythm", "atrial-fibrillation", "sinus-bradycardia"],
    leadFocus: "II",
    tier: "intermediate",
    match: (row) => has(row, "SARRH") && !hasAny(row, ["AFIB", "AFLT", "PVC", "PAC", "PACE", "2AVB", "3AVB"]),
    lesson: {
      estMinutes: 3,
      sections: [
        {
          heading: "What it is",
          body:
            "Sinus arrhythmia is a normal sinus rhythm whose rate varies cyclically, " +
            "most often with the respiratory cycle — speeding up on inspiration and " +
            "slowing on expiration. The impulses still originate in the SA node.",
        },
        {
          heading: "How to recognise it",
          body:
            "Each QRS is preceded by an upright sinus P wave in lead II (as in normal " +
            "sinus rhythm), but the R–R interval changes gradually and smoothly. The " +
            "key contrast with atrial fibrillation is that the variation is cyclical " +
            "and the P waves are normal — not the chaotic, P-less irregularity of AF.",
        },
      ],
      keyFacts: [
        "Upright sinus P wave before every QRS (as in normal sinus rhythm)",
        "R–R interval varies cyclically, often with respiration",
        "Normal P-wave morphology (distinguishes it from AF)",
        "A common, benign finding, especially in the young",
      ],
    },
  },
  {
    id: "pac",
    name: "Atrial premature complexes",
    shortName: "PAC",
    superclass: "RHYTHM",
    scpCodes: ["PAC"],
    order: 14,
    summary: "Early beats from an ectopic atrial focus.",
    answerLabel: "Atrial premature complex(es)",
    confusableWith: ["pvc", "atrial-fibrillation", "sinus-rhythm"],
    leadFocus: "II",
    tier: "intermediate",
    match: (row) => has(row, "PAC") && !hasAny(row, ["AFIB", "AFLT", "PACE", "PVC"]),
    lesson: {
      estMinutes: 4,
      sections: [
        {
          heading: "What it is",
          body:
            "An atrial premature complex (APC/PAC) is an early beat triggered by an " +
            "ectopic focus in the atria rather than the SA node. It travels down the " +
            "normal conduction system, so the QRS is usually narrow.",
        },
        {
          heading: "How to recognise it",
          body:
            "Look for a P wave that arrives early and has a different shape from the " +
            "sinus P waves, followed by a normal (narrow) QRS. It is typically " +
            "followed by an incomplete compensatory pause. Contrast with a PVC, whose " +
            "early beat is wide and has no preceding P wave.",
        },
      ],
      keyFacts: [
        "Early P wave of abnormal morphology",
        "Usually a narrow (normally-conducted) QRS follows",
        "Often an incomplete compensatory pause",
        "Narrow QRS + preceding abnormal P distinguishes it from a PVC",
      ],
    },
  },
  {
    id: "paced",
    name: "Paced rhythm",
    shortName: "Paced",
    superclass: "RHYTHM",
    scpCodes: ["PACE"],
    order: 15,
    summary: "Pacing spikes driving the atria and/or ventricles.",
    answerLabel: "Paced rhythm",
    confusableWith: ["lbbb", "sinus-rhythm", "atrial-fibrillation"],
    leadFocus: "V1",
    tier: "intermediate",
    match: (row) => has(row, "PACE"),
    lesson: {
      estMinutes: 4,
      sections: [
        {
          heading: "What it is",
          body:
            "A paced rhythm is generated by an implanted pacemaker. A small, sharp " +
            "pacing 'spike' precedes the chamber it stimulates — a spike before the P " +
            "wave for atrial pacing, before the QRS for ventricular pacing, or both.",
        },
        {
          heading: "How to recognise it",
          body:
            "Find the narrow vertical pacing spikes. Ventricular pacing produces a " +
            "wide QRS that usually resembles left bundle branch block (the RV lead " +
            "activates the right ventricle first). Seeing the spike immediately before " +
            "each wide QRS is the giveaway.",
        },
      ],
      keyFacts: [
        "Sharp pacing spikes before paced complexes",
        "Ventricular pacing → wide, LBBB-like QRS",
        "Atrial pacing → spike before the P wave",
        "Spikes distinguish pacing from an intrinsic bundle branch block",
      ],
    },
  },
  {
    id: "rvh",
    name: "Right ventricular hypertrophy",
    shortName: "RVH",
    superclass: "HYP",
    scpCodes: ["RVH"],
    order: 16,
    summary: "Right-axis deviation with a dominant R in V1.",
    answerLabel: "Right ventricular hypertrophy",
    confusableWith: ["lvh", "rbbb", "lafb"],
    leadFocus: "V1",
    tier: "advanced",
    match: (row) =>
      has(row, "RVH") && !hasAny(row, ["CLBBB", "CRBBB", "AFIB", "AFLT"]) && !isAcuteMi(row),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "Right ventricular hypertrophy is thickened right-ventricular muscle, " +
            "usually from chronic pressure overload (pulmonary hypertension, pulmonary " +
            "stenosis, chronic lung disease). The enlarged right ventricle shifts the " +
            "electrical forces rightward and anteriorly.",
        },
        {
          heading: "How to recognise it",
          body:
            "Look for right-axis deviation and a dominant R wave in V1 (R greater than " +
            "S), often with a deep S wave in V6 and right-precordial ST depression / " +
            "T-wave inversion ('right heart strain'). Signs of right atrial enlargement " +
            "may accompany it.",
        },
      ],
      keyFacts: [
        "Right-axis deviation",
        "Dominant R wave in V1 (R/S > 1)",
        "Deep S wave in V5–V6",
        "Right-precordial strain (ST depression / T inversion in V1–V3)",
      ],
    },
  },
  {
    id: "lae",
    name: "Left atrial enlargement",
    shortName: "LAE",
    superclass: "HYP",
    scpCodes: ["LAO/LAE"],
    order: 17,
    summary: "Broad, notched P waves — the 'P mitrale'.",
    answerLabel: "Left atrial enlargement",
    confusableWith: ["rvh", "lvh", "sinus-rhythm"],
    leadFocus: "II",
    tier: "advanced",
    match: (row) =>
      has(row, "LAO/LAE") && !hasAny(row, ["AFIB", "AFLT", "PACE"]) && !isAcuteMi(row),
    lesson: {
      estMinutes: 4,
      sections: [
        {
          heading: "What it is",
          body:
            "Left atrial enlargement reflects increased left-atrial size or pressure. " +
            "Because the left atrium depolarises second, its enlargement prolongs and " +
            "distorts the terminal part of the P wave.",
        },
        {
          heading: "How to recognise it",
          body:
            "In lead II the P wave becomes broad (≥120 ms) and notched with two humps " +
            "('P mitrale'). In V1 the P wave has a deep, wide negative terminal " +
            "component. Sinus rhythm is otherwise preserved.",
        },
      ],
      keyFacts: [
        "Broad (≥120 ms), notched P wave in lead II ('P mitrale')",
        "Deep, wide negative terminal P deflection in V1",
        "Rhythm is otherwise sinus",
      ],
    },
  },
  {
    id: "ischemic-st-t",
    name: "Ischemic / nonspecific ST–T changes",
    shortName: "ST–T",
    superclass: "STTC",
    scpCodes: ["ISC_", "STD_", "NST_", "NDT", "TAB_", "INVT", "ISCAL", "ISCAS", "ISCAN", "ISCIN", "ISCIL", "ISCLA"],
    order: 18,
    summary: "ST-segment and T-wave changes suggesting ischemia.",
    answerLabel: "Ischemic ST–T changes",
    confusableWith: ["stemi", "lvh", "sinus-rhythm"],
    leadFocus: "V5",
    tier: "advanced",
    distractorHint: "ST depression and/or T-wave changes (ischemic or nonspecific), without acute ST elevation",
    match: (row) =>
      hasAny(row, ["ISC_", "STD_", "ISCAL", "ISCAS", "ISCAN", "ISCIN", "ISCIL", "ISCLA"]) &&
      !isAcuteMi(row) &&
      !hasAny(row, ["AFIB", "AFLT", "PACE", "CLBBB", "CRBBB", "LVH"]),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "Ischemia that has not (or not yet) produced ST elevation still leaves a " +
            "signature on the ST segment and T wave. These changes are more subtle than " +
            "a STEMI and are read together with the clinical picture.",
        },
        {
          heading: "How to recognise it",
          body:
            "Look for horizontal or down-sloping ST depression and T-wave inversion, " +
            "grouped in a regional set of leads (e.g. the lateral or inferior group). " +
            "Unlike STEMI there is no territorial ST elevation. The changes may be " +
            "described as 'ischemic' when regional, or 'nonspecific' when scattered.",
        },
        {
          heading: "A caution",
          body:
            "ST–T changes are among the least specific ECG findings — they occur with " +
            "ischemia but also with strain, drugs, electrolyte shifts and many other " +
            "conditions. Interpret them in context, never in isolation.",
        },
      ],
      keyFacts: [
        "Horizontal/down-sloping ST depression",
        "T-wave inversion, often regional",
        "No territorial ST elevation (distinguishes from STEMI)",
        "Nonspecific — many non-ischemic causes; correlate clinically",
      ],
    },
  },

  // ── Advanced / niche, data-backed by PTB-XL ──────────────────────────────
  {
    id: "second-degree-av-block",
    name: "Second-degree AV block",
    shortName: "2° AVB",
    superclass: "CD",
    scpCodes: ["2AVB"],
    order: 19,
    summary: "Some P waves conduct, some are dropped.",
    answerLabel: "Second-degree AV block",
    confusableWith: ["first-degree-av-block", "third-degree-av-block", "sinus-arrhythmia"],
    leadFocus: "II",
    tier: "advanced",
    match: (row) => has(row, "2AVB") && !has(row, "3AVB"),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "In second-degree AV block, conduction from atria to ventricles fails " +
            "intermittently — some P waves are followed by a QRS and some are not. " +
            "There are two classic forms.",
        },
        {
          heading: "Mobitz I vs Mobitz II",
          body:
            "Mobitz I (Wenckebach): the PR interval lengthens progressively beat to " +
            "beat until one P wave is not conducted (a 'dropped' QRS), then the cycle " +
            "resets. Mobitz II: the PR interval stays constant and a QRS is suddenly " +
            "dropped without warning — this form is more dangerous and often needs a " +
            "pacemaker.",
        },
        {
          heading: "How to recognise it",
          body:
            "Find the non-conducted P wave (a P with no following QRS). Then check " +
            "whether the PR intervals before it were lengthening (Mobitz I) or constant " +
            "(Mobitz II).",
        },
      ],
      keyFacts: [
        "Intermittent non-conducted P waves (dropped QRS)",
        "Mobitz I: PR progressively lengthens before the dropped beat",
        "Mobitz II: PR constant, QRS dropped suddenly",
        "Some — but not all — P waves conduct (unlike complete block)",
      ],
    },
  },
  {
    id: "third-degree-av-block",
    name: "Third-degree (complete) AV block",
    shortName: "3° AVB",
    superclass: "CD",
    scpCodes: ["3AVB"],
    order: 20,
    summary: "Atria and ventricles beat independently.",
    answerLabel: "Third-degree (complete) AV block",
    confusableWith: ["second-degree-av-block", "first-degree-av-block", "sinus-bradycardia"],
    leadFocus: "II",
    tier: "advanced",
    match: (row) => has(row, "3AVB"),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "In third-degree (complete) AV block, no atrial impulses reach the " +
            "ventricles. The atria and ventricles are driven by separate pacemakers " +
            "and beat completely independently of each other.",
        },
        {
          heading: "How to recognise it",
          body:
            "Look for AV dissociation: regular P waves at one rate and regular QRS " +
            "complexes at a slower rate, with no fixed relationship between them (the " +
            "PR interval varies randomly). A slow escape rhythm — junctional (narrow) " +
            "or ventricular (wide) — maintains the ventricular rate.",
        },
      ],
      keyFacts: [
        "Complete AV dissociation — P waves and QRS unrelated",
        "Atrial rate faster than the (slow) ventricular escape rate",
        "PR interval varies with no pattern",
        "Escape rhythm: junctional (narrow) or ventricular (wide)",
      ],
    },
  },
  {
    id: "wpw",
    name: "Wolff–Parkinson–White (pre-excitation)",
    shortName: "WPW",
    superclass: "CD",
    scpCodes: ["WPW"],
    order: 21,
    summary: "Short PR with a delta wave from an accessory pathway.",
    answerLabel: "Wolff–Parkinson–White (pre-excitation)",
    confusableWith: ["rbbb", "lbbb", "sinus-rhythm"],
    leadFocus: "V3",
    tier: "expert",
    match: (row) => has(row, "WPW") && !hasAny(row, ["AFIB", "AFLT", "PACE"]) && !isAcuteMi(row),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "In Wolff–Parkinson–White there is an accessory pathway that conducts " +
            "directly from atrium to ventricle, bypassing the AV node. Part of the " +
            "ventricle is therefore activated early ('pre-excited').",
        },
        {
          heading: "How to recognise it",
          body:
            "The triad is a short PR interval (<120 ms), a delta wave (a slurred, " +
            "slow upstroke at the start of the QRS), and a consequently widened QRS. " +
            "Secondary ST-T changes are common.",
        },
        {
          heading: "Why it matters",
          body:
            "The accessory pathway predisposes to re-entrant tachycardias (AVRT). If " +
            "atrial fibrillation occurs, rapid conduction down the pathway can be " +
            "dangerous. Recognition is the point here — management is clinical.",
        },
      ],
      keyFacts: [
        "Short PR interval (< 120 ms)",
        "Delta wave — slurred initial upstroke of the QRS",
        "Widened QRS",
        "Predisposes to AV re-entrant tachycardia",
      ],
    },
  },
  {
    id: "long-qt",
    name: "Long QT interval",
    shortName: "Long QT",
    superclass: "STTC",
    scpCodes: ["LNGQT"],
    order: 22,
    summary: "Prolonged repolarisation — a risk for torsades.",
    answerLabel: "Long QT interval",
    confusableWith: ["ischemic-st-t", "sinus-rhythm", "lvh"],
    leadFocus: "II",
    tier: "expert",
    match: (row) => has(row, "LNGQT") && !hasAny(row, ["AFIB", "AFLT", "PACE"]) && !isAcuteMi(row),
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "The QT interval measures ventricular depolarisation plus repolarisation. " +
            "When it is prolonged, the heart is vulnerable to a dangerous polymorphic " +
            "ventricular tachycardia called torsades de pointes.",
        },
        {
          heading: "How to recognise it",
          body:
            "Measure the QT from the start of the QRS to the end of the T wave and " +
            "correct for heart rate (QTc). A QTc above roughly 450 ms in men or 470 ms " +
            "in women is prolonged. Because QT varies with rate, always use the " +
            "corrected value.",
        },
        {
          heading: "Causes",
          body:
            "Congenital channelopathies, many drugs, and electrolyte abnormalities " +
            "(low potassium, magnesium, or calcium) prolong the QT. Identifying it on " +
            "the ECG prompts a search for a reversible cause.",
        },
      ],
      keyFacts: [
        "QTc > ~450 ms (men) / ~470 ms (women)",
        "Always rate-correct the QT (QTc)",
        "Risk of torsades de pointes (polymorphic VT)",
        "Causes: congenital, drugs, low K⁺/Mg²⁺/Ca²⁺",
      ],
    },
  },
];

export const TYPES_BY_ID: Record<string, TypeDef> = Object.fromEntries(
  TYPES.map((t) => [t.id, t]),
);

/** MI location code → readable territory, for question explanations. */
export const MI_TERRITORY: Record<string, string> = {
  IMI: "inferior",
  ILMI: "inferolateral",
  IPMI: "inferoposterior",
  IPLMI: "inferoposterolateral",
  AMI: "anterior",
  ASMI: "anteroseptal",
  ALMI: "anterolateral",
  LMI: "lateral",
  PMI: "posterior",
};

/** Module label for a superclass, used to group the curriculum. */
export const MODULE_LABEL: Record<string, string> = {
  NORM: "Foundations",
  RHYTHM: "Rhythm",
  CD: "Conduction",
  HYP: "Chambers & hypertrophy",
  MI: "Ischemia & infarction",
  STTC: "ST/T changes",
};

/** Order in which modules appear. */
export const MODULE_ORDER = ["NORM", "RHYTHM", "CD", "HYP", "MI", "STTC"];
