/**
 * Originally-authored niche/expert content for patterns PTB-XL underrepresents
 * (Brugada, Wellens, De Winter, hyperkalaemia). These are **not** derived from
 * any dataset or copyrighted source — they are written from standard, settled
 * ECG teaching criteria. They are waveform-free "concept" questions.
 *
 * EVERY authored clinical item here is flagged in REVIEW.md for a clinician to
 * verify before it is treated as authoritative.
 */

export interface AuthoredLesson {
  estMinutes: number;
  sections: { heading: string; body: string }[];
  keyFacts: string[];
}

export interface AuthoredType {
  id: string;
  name: string;
  shortName: string;
  superclass: string; // "EXPERT"
  order: number;
  tier: "expert";
  summary: string;
  lesson: AuthoredLesson;
}

export interface AuthoredQuestion {
  typeId: string;
  tier: "expert";
  stem: string;
  options: string[]; // first is the correct answer; shuffled at ingest
  explanation: string;
}

export const AUTHORED_TYPES: AuthoredType[] = [
  {
    id: "brugada",
    name: "Brugada pattern",
    shortName: "Brugada",
    superclass: "EXPERT",
    order: 30,
    tier: "expert",
    summary: "Coved ST elevation in V1–V2 — a channelopathy.",
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "Brugada is an inherited sodium-channel disorder (channelopathy) that " +
            "produces a characteristic pattern in the right precordial leads and " +
            "carries a risk of polymorphic ventricular tachycardia and sudden death.",
        },
        {
          heading: "The type 1 (diagnostic) pattern",
          body:
            "In leads V1–V2 the ST segment is elevated ≥2 mm with a coved " +
            "(down-sloping) shape that runs into a negative T wave. The type 2/3 " +
            "'saddleback' patterns are suggestive but not diagnostic on their own.",
        },
      ],
      keyFacts: [
        "Coved ST elevation ≥2 mm in V1–V2 (type 1)",
        "ST runs down into a negative T wave",
        "Right precordial leads (V1–V2)",
        "Risk of polymorphic VT / sudden cardiac death",
      ],
    },
  },
  {
    id: "wellens",
    name: "Wellens syndrome",
    shortName: "Wellens",
    superclass: "EXPERT",
    order: 31,
    tier: "expert",
    summary: "Biphasic/deep T inversions in V2–V3 — critical LAD warning.",
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "Wellens syndrome is a pattern of T-wave changes in the anterior leads " +
            "that signals critical stenosis of the proximal left anterior descending " +
            "(LAD) artery — a warning of impending large anterior infarction.",
        },
        {
          heading: "How to recognise it",
          body:
            "In V2–V3, either deeply biphasic T waves (type A) or deep, symmetric " +
            "T-wave inversions (type B) appear, typically when the patient is " +
            "pain-free. R waves are preserved, there are no pathological Q waves, and " +
            "ST elevation is minimal or absent.",
        },
      ],
      keyFacts: [
        "Biphasic or deep symmetric T-wave inversion in V2–V3",
        "Preserved R waves, no Q waves, little/no ST elevation",
        "Often seen when pain-free",
        "Indicates critical proximal LAD stenosis (impending anterior MI)",
      ],
    },
  },
  {
    id: "de-winter",
    name: "De Winter T waves",
    shortName: "De Winter",
    superclass: "EXPERT",
    order: 32,
    tier: "expert",
    summary: "Upsloping ST depression + tall T — an LAD-occlusion equivalent.",
    lesson: {
      estMinutes: 4,
      sections: [
        {
          heading: "What it is",
          body:
            "The De Winter pattern is a recognised STEMI-equivalent: it indicates " +
            "acute occlusion of the proximal LAD even though the classic ST elevation " +
            "is absent.",
        },
        {
          heading: "How to recognise it",
          body:
            "The precordial leads show upsloping ST depression at the J point that " +
            "continues into tall, symmetric T waves, often with slight ST elevation in " +
            "aVR. It should be treated as an acute anterior occlusion.",
        },
      ],
      keyFacts: [
        "Upsloping ST depression at the J point in V1–V6",
        "Tall, symmetric ('hyperacute') T waves",
        "Often slight ST elevation in aVR",
        "A STEMI-equivalent — acute proximal LAD occlusion",
      ],
    },
  },
  {
    id: "hyperkalemia",
    name: "Hyperkalaemia pattern",
    shortName: "HyperK",
    superclass: "EXPERT",
    order: 33,
    tier: "expert",
    summary: "Peaked T waves → wide QRS → sine wave.",
    lesson: {
      estMinutes: 5,
      sections: [
        {
          heading: "What it is",
          body:
            "A high serum potassium changes the ECG in a progressive, recognisable " +
            "sequence. Recognising it early can be life-saving because severe " +
            "hyperkalaemia is a medical emergency.",
        },
        {
          heading: "The progression",
          body:
            "First the T waves become tall, narrow and peaked ('tented'). As " +
            "potassium rises further the P waves flatten and the PR lengthens, then " +
            "the QRS widens. In the extreme the widened QRS merges with the T wave " +
            "into a sine-wave pattern that precedes cardiac arrest.",
        },
      ],
      keyFacts: [
        "Earliest: tall, peaked ('tented') T waves",
        "Then: flat/absent P waves and PR prolongation",
        "Then: progressive QRS widening",
        "Severe: sine-wave pattern → arrest",
      ],
    },
  },
];

export const AUTHORED_QUESTIONS: AuthoredQuestion[] = [
  // ── Brugada ──────────────────────────────────────────────────────────────
  {
    typeId: "brugada",
    tier: "expert",
    stem: "Which ECG finding defines the diagnostic (type 1) Brugada pattern?",
    options: [
      "Coved ST elevation ≥2 mm with a negative T wave in V1–V2",
      "Saddleback ST elevation with an upright T wave in V1–V2",
      "Diffuse concave ST elevation with PR depression",
      "Horizontal ST depression in V5–V6",
    ],
    explanation:
      "Type 1 Brugada is a coved (down-sloping) ST elevation ≥2 mm running into a " +
      "negative T wave in the right precordial leads V1–V2. The saddleback shape is " +
      "the type 2/3 pattern (suggestive, not diagnostic). Diffuse concave elevation " +
      "with PR depression is pericarditis, and lateral ST depression is a nonspecific/" +
      "ischaemic finding — neither is Brugada.",
  },
  {
    typeId: "brugada",
    tier: "expert",
    stem: "In which leads is the Brugada pattern seen?",
    options: ["V1–V2 (right precordial)", "II, III, aVF (inferior)", "V5–V6 (lateral)", "aVR only"],
    explanation:
      "The Brugada pattern appears in the right precordial leads V1–V2 (sometimes V3). " +
      "The inferior and lateral groups reflect other territories, and aVR alone is not " +
      "where Brugada is defined.",
  },
  {
    typeId: "brugada",
    tier: "expert",
    stem: "What is the main clinical risk of the Brugada pattern?",
    options: [
      "Polymorphic VT / ventricular fibrillation and sudden death",
      "Progressive heart block requiring a pacemaker",
      "Atrial fibrillation with slow ventricular response",
      "Pulmonary embolism",
    ],
    explanation:
      "Brugada is a channelopathy that predisposes to polymorphic VT/VF and sudden " +
      "cardiac death. It is not primarily a disorder of AV conduction, is unrelated to " +
      "a slow AF response, and has nothing to do with pulmonary embolism.",
  },

  // ── Wellens ──────────────────────────────────────────────────────────────
  {
    typeId: "wellens",
    tier: "expert",
    stem: "Wellens syndrome is characterised by T-wave changes in which leads?",
    options: ["V2–V3 (anterior)", "II, III, aVF (inferior)", "I and aVL (high lateral)", "V1 only"],
    explanation:
      "Wellens shows biphasic or deep symmetric T-wave inversions in V2–V3. Inferior " +
      "or high-lateral changes point to other territories, and V1 alone is not the " +
      "Wellens distribution.",
  },
  {
    typeId: "wellens",
    tier: "expert",
    stem: "What does the Wellens pattern signify?",
    options: [
      "Critical proximal LAD stenosis — impending anterior MI",
      "A completed old inferior infarction",
      "Benign early repolarisation",
      "Acute pericarditis",
    ],
    explanation:
      "Wellens T waves warn of critical proximal LAD stenosis and impending anterior " +
      "MI, even when the patient is currently pain-free. It is not an old infarct, and " +
      "neither early repolarisation nor pericarditis produces this specific biphasic/" +
      "deeply-inverted anterior T-wave pattern with preserved R waves.",
  },
  {
    typeId: "wellens",
    tier: "expert",
    stem: "Which feature helps distinguish Wellens from an evolving anterior STEMI?",
    options: [
      "Preserved R waves with little/no ST elevation, typically when pain-free",
      "Marked ST elevation with new Q waves",
      "Diffuse concave ST elevation",
      "Irregularly irregular rhythm",
    ],
    explanation:
      "In Wellens the R waves are preserved and there is minimal ST elevation and no Q " +
      "waves — the abnormality is the T wave, often seen pain-free. Marked ST elevation " +
      "with Q waves is a STEMI, diffuse concave elevation is pericarditis, and rhythm " +
      "irregularity is unrelated.",
  },

  // ── De Winter ────────────────────────────────────────────────────────────
  {
    typeId: "de-winter",
    tier: "expert",
    stem: "The De Winter pattern is best described as…",
    options: [
      "Upsloping ST depression at the J point with tall, symmetric T waves",
      "Coved ST elevation with a negative T wave in V1–V2",
      "Saddleback ST elevation in V1–V2",
      "Widespread concave ST elevation with PR depression",
    ],
    explanation:
      "De Winter shows upsloping ST depression at the J point in the precordial leads " +
      "continuing into tall, symmetric T waves (often with slight aVR ST elevation). " +
      "Coved and saddleback elevations are Brugada patterns; diffuse concave elevation " +
      "with PR depression is pericarditis.",
  },
  {
    typeId: "de-winter",
    tier: "expert",
    stem: "What does the De Winter pattern indicate?",
    options: [
      "Acute proximal LAD occlusion (a STEMI-equivalent)",
      "Chronic stable angina",
      "Left ventricular hypertrophy with strain",
      "Normal variant in athletes",
    ],
    explanation:
      "De Winter T waves are a recognised STEMI-equivalent indicating acute proximal " +
      "LAD occlusion and warrant emergent reperfusion. They are not a feature of stable " +
      "angina, LVH strain (which gives lateral ST depression/T inversion), or a normal " +
      "athletic variant.",
  },

  // ── Hyperkalaemia ────────────────────────────────────────────────────────
  {
    typeId: "hyperkalemia",
    tier: "expert",
    stem: "What is the earliest classic ECG sign of hyperkalaemia?",
    options: [
      "Tall, peaked ('tented') T waves",
      "Prominent U waves",
      "A delta wave",
      "ST-segment elevation in V1–V2",
    ],
    explanation:
      "The earliest classic change of hyperkalaemia is tall, narrow, peaked T waves. " +
      "Prominent U waves suggest hypokalaemia, a delta wave is pre-excitation (WPW), " +
      "and right precordial ST elevation is not the hyperkalaemia signature.",
  },
  {
    typeId: "hyperkalemia",
    tier: "expert",
    stem: "As hyperkalaemia becomes more severe, the QRS complex…",
    options: [
      "Widens, and can merge with the T wave into a sine wave",
      "Narrows progressively",
      "Develops an rSR′ pattern in V1",
      "Is unchanged",
    ],
    explanation:
      "Rising potassium progressively widens the QRS, ultimately producing a sine-wave " +
      "pattern that heralds arrest. The QRS does not narrow, and while conduction " +
      "slows, the specific rSR′ of RBBB is not the hyperkalaemia mechanism.",
  },
  {
    typeId: "hyperkalemia",
    tier: "expert",
    stem: "Which additional change accompanies worsening hyperkalaemia?",
    options: [
      "Flattening/loss of P waves with PR prolongation",
      "Shortening of the PR interval",
      "Deepening Q waves in the inferior leads",
      "A rapidly rising, irregular atrial rate",
    ],
    explanation:
      "As potassium rises the P waves flatten and may disappear and the PR lengthens, " +
      "alongside QRS widening. The PR does not shorten, hyperkalaemia does not carve " +
      "inferior Q waves, and it does not cause an irregular atrial tachyarrhythmia.",
  },
];
