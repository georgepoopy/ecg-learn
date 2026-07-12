/**
 * Curated ECG taxonomy: maps PTB-XL SCP codes to human-readable, teachable ECG
 * types, and holds the ORIGINALLY-AUTHORED lesson content + question templates.
 *
 * Nothing here is scraped. Lesson facts are standard, settled ECG criteria
 * (rate/rhythm/interval/morphology). Anything ambiguous is flagged in REVIEW.md
 * rather than asserted.
 */

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
  /** PTB-XL SCP codes conceptually belonging to this type. */
  scpCodes: string[];
  order: number;
  /** Short teaser shown on the curriculum map. */
  summary: string;
  /** Answer label shown as the correct MCQ option. */
  answerLabel: string;
  /** Preferred confusable type ids for distractors (best-first). */
  confusableWith: string[];
  /** Optional lead to spotlight in the renderer for this type. */
  leadFocus?: string;
  /** Does this record qualify as a clean teaching example of this type? */
  match: (row: PtbRow) => boolean;
  lesson: LessonContent;
}

// --- Diagnostic-class code groups (from scp_statements.csv) ------------------

/** Rhythm codes other than plain sinus rhythm — presence means "not clean SR". */
export const NON_SINUS_RHYTHM = [
  "AFIB", "AFLT", "STACH", "SBRAD", "SARRH", "SVARR", "SVTAC", "PSVT",
  "BIGU", "TRIGU", "PACE", "PVC", "PAC", "PRC(S)",
];

/** All abnormal *diagnostic* subclass codes (MI / STTC / CD / HYP). Presence
 * disqualifies a record from being a "normal sinus rhythm" example. */
export const ABNORMAL_DIAGNOSTIC = [
  // MI
  "IMI", "ASMI", "ILMI", "AMI", "ALMI", "INJAS", "LMI", "IPLMI", "IPMI",
  "INJAL", "INJIN", "INJLA", "PMI", "INJIL", "ANEUR",
  // STTC
  "NDT", "NST_", "DIG", "LNGQT", "ISC_", "ISCAL", "ISCIN", "ISCIL", "ISCAS",
  "ISCLA", "ISCAN", "STD_", "STE_", "TAB_", "INVT", "LOWT", "NT_", "EL",
  // CD (conduction)
  "LAFB", "IRBBB", "CRBBB", "CLBBB", "ILBBB", "LPFB", "IVCD", "WPW", "3AVB",
  "2AVB", "1AVB",
  // HYP
  "LVH", "RVH", "LAO/LAE", "RAO/RAE", "SEHYP", "VCLVH", "HVOLT", "LVOLT",
];

/** MI diagnostic subclass codes (location statements). */
export const MI_CODES = [
  "IMI", "ASMI", "ILMI", "AMI", "ALMI", "LMI", "IPLMI", "IPMI", "PMI",
];

/** Codes indicating acute injury current / ST-elevation. */
export const INJURY_CODES = ["INJAS", "INJAL", "INJIN", "INJLA", "INJIL", "STE_"];

/** Infarction stages that correspond to the acute / recent (ST-elevation) phase. */
export const ACUTE_STADIA = new Set(["Stadium I", "Stadium I-II", "Stadium II"]);

const has = (row: PtbRow, code: string) => code in row.scp;
const hasAny = (row: PtbRow, codes: string[]) => codes.some((c) => c in row.scp);

// --- The curated types -------------------------------------------------------

export const TYPES: TypeDef[] = [
  {
    id: "sinus-rhythm",
    name: "Normal sinus rhythm",
    shortName: "NSR",
    superclass: "NORM",
    scpCodes: ["SR", "NORM"],
    order: 1,
    summary: "The healthy baseline: SA-node rhythm, everything in range.",
    answerLabel: "Normal sinus rhythm",
    confusableWith: ["afib", "first-degree-av-block", "stemi"],
    leadFocus: "II",
    // Clean normal: sinus rhythm, labelled normal ECG, no abnormal diagnostic
    // statements and no non-sinus rhythm annotations.
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
            "(4) normal intervals — PR 120–200 ms and QRS under 120 ms. If all four " +
            "hold and no abnormal ST/T or hypertrophy features are present, it is a " +
            "normal sinus tracing.",
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

  {
    id: "afib",
    name: "Atrial fibrillation",
    shortName: "AF",
    superclass: "RHYTHM",
    scpCodes: ["AFIB"],
    order: 2,
    summary: "Irregularly irregular, with no true P waves.",
    answerLabel: "Atrial fibrillation",
    confusableWith: ["sinus-rhythm", "first-degree-av-block", "stemi"],
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
            "Two features define it on the surface ECG: there are no discrete P " +
            "waves — the baseline is flat or shows fine/coarse fibrillatory waves — " +
            "and the R–R intervals are irregularly irregular, following no repeating " +
            "pattern. The QRS complexes themselves are usually normal in width.",
        },
        {
          heading: "Rate vs. rhythm",
          body:
            "The ventricular rate can be slow, normal, or fast; rate does not define " +
            "AF. What defines it is the absence of organised atrial activity plus the " +
            "irregular ventricular response. Contrast this with atrial flutter, which " +
            "has organised saw-tooth flutter waves and is often regular.",
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
    id: "first-degree-av-block",
    name: "First-degree AV block",
    shortName: "1° AVB",
    superclass: "CD",
    scpCodes: ["1AVB"],
    order: 3,
    summary: "Every beat conducts, but the PR interval is long.",
    answerLabel: "First-degree AV block",
    confusableWith: ["sinus-rhythm", "afib", "stemi"],
    leadFocus: "II",
    match: (row) => has(row, "1AVB") && !has(row, "2AVB") && !has(row, "3AVB"),
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
            "The AV blocks form a ladder. First-degree is pure delay with 1:1 " +
            "conduction. Second-degree drops some beats (the PR may lengthen until a " +
            "QRS is missed, or drop suddenly). Third-degree is complete dissociation. " +
            "Seeing a long but constant PR with no dropped beats places it firmly at " +
            "first-degree.",
        },
      ],
      keyFacts: [
        "PR interval > 200 ms",
        "PR interval constant from beat to beat",
        "Every P wave is followed by a QRS (1:1 conduction, no dropped beats)",
        "Usually an incidental finding on an otherwise sinus tracing",
      ],
    },
  },

  {
    id: "stemi",
    name: "ST-elevation myocardial infarction (pattern)",
    shortName: "STEMI",
    superclass: "MI",
    scpCodes: [...MI_CODES, ...INJURY_CODES],
    order: 4,
    summary: "Territorial ST elevation — an acute-injury pattern.",
    answerLabel: "ST-elevation MI (STEMI) pattern",
    confusableWith: ["sinus-rhythm", "afib", "first-degree-av-block"],
    // Acute/recent infarction stage + a location or injury code present.
    match: (row) =>
      ACUTE_STADIA.has(row.infarctionStadium1) &&
      hasAny(row, [...MI_CODES, ...INJURY_CODES]),
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
            "on the T waves may be tall and broad ('hyperacute'); over hours to days " +
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
