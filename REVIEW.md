# Clinician Review Queue

Items below are content or data-mapping decisions that need verification by a
qualified clinician before being treated as authoritative. Each is currently
handled conservatively in code/copy; this list exists so nothing ambiguous is
silently presented as fact.

Status key: 🔲 unreviewed · ✅ verified · ✏️ needs edit

---

## Round 3 — Chapman-Shaoxing/Ningbo SNOMED mapping (items 22–25)

Second data source added (CC-BY 4.0, license-verified — see DATA_SOURCES.md).
Records labelled with SNOMED-CT are mapped into the existing taxonomy via
`scripts/ingest/chapman-map.ts`. Mapping decisions to verify:

### 22. 🔲 Generic MI SNOMED codes are NOT mapped
**Decision:** SNOMED 164865005 ("myocardial infarction") and its wall variants
carry no acuity, so they are **excluded** — mapping them to our acute-STEMI type
would mislabel old/indeterminate MI as an acute ST-elevation pattern. Chapman
therefore contributes **no** STEMI questions. **Question:** accept exclusion, or
add a dedicated "prior MI / pathological Q-wave" type to use them?

### 23. 🔲 Left-bundle variants share one SNOMED code
**Decision:** In this dataset LBBB / "left back BBB" / "left front BBB" all share
SNOMED 164909002, so fascicular subtypes cannot be distinguished from the code;
all map to **LBBB**. **Question:** acceptable, or drop these to avoid conflating
LAFB/LPFB with LBBB?

### 24. 🔲 Axis questions suppressed for Chapman records
**Decision:** Chapman records have no heart-axis label to cross-check a computed
axis against, so **axis questions are not generated** from them (rate questions
are kept — they cross-check against the SB/ST labels). **Question:** confirm this
conservative choice.

### 25. 🔲 SNOMED → SCP condition equivalences
**Decision:** e.g. Chapman "Sinus Irregularity" (427393009) → our sinus
arrhythmia; "ST-T Change"/"ST drop-down" → ST-depression/ischaemic-ST-T group;
"QT interval extension" → Long QT; "T wave opposite" → T inversion. Full table in
`chapman-map.ts`. **Question:** sanity-check the equivalences. Rare rhythms with
no teachable type yet (AVNRT, AVRT, junctional, wandering pacemaker, U waves) are
recognised but **not** turned into questions.

---

## Round 2 — authored niche/expert content (items 18–21)

These are **originally authored** waveform-free "concept" questions and lessons
for patterns PTB-XL underrepresents. Written from standard teaching criteria; no
dataset or copyrighted source used. **All need clinician sign-off before going
live.** Source: `scripts/ingest/authored.ts`.

### 18. 🔲 Brugada pattern (type `brugada`)
Lesson + 3 questions: type-1 = coved ST elevation ≥2 mm → negative T in V1–V2;
leads V1–V2; risk = polymorphic VT/VF/sudden death. **Verify** the ≥2 mm/coved
criterion wording and that type-2/3 saddleback is correctly framed as
non-diagnostic.

### 19. 🔲 Wellens syndrome (type `wellens`)
Lesson + 3 questions: biphasic/deep symmetric T inversion in V2–V3; preserved R
waves, minimal ST elevation, often pain-free; signifies critical proximal LAD
stenosis. **Verify** the type A/B description and the "pain-free / preserved R"
distinguishing features.

### 20. 🔲 De Winter T waves (type `de-winter`)
Lesson + 2 questions: upsloping ST depression at the J point with tall symmetric
T waves ± aVR ST elevation; STEMI-equivalent = acute proximal LAD occlusion.
**Verify** the description and STEMI-equivalent framing.

### 21. 🔲 Hyperkalaemia pattern (type `hyperkalemia`)
Lesson + 3 questions: peaked/tented T (earliest) → P flattening + PR prolongation
→ QRS widening → sine wave. **Verify** the ordering of changes and the sine-wave/
arrest endpoint.

Also newly **data-backed** (real PTB-XL waveforms), standard criteria — lower
risk but worth a glance: `wpw` (short PR + delta), `long-qt` (QTc thresholds
~450 M/470 F), `second-degree-av-block` (Mobitz I vs II), `third-degree-av-block`
(AV dissociation). 2°/3° AVB have small real-record banks (6 and 4 records).

---

## Round 2 — expanded generator (items 13–17)

### 13. 🔲 Computed ventricular-rate questions
**Where:** `scripts/ingest/features.ts` `estimateRate`, used by `generate.ts` `tRate`.
**Decision made:** Rate is measured by a simple R-peak detector (rectified,
baseline-corrected lead II, threshold + refractory period), taking the median
R–R. A rate question is emitted **only** when the detector is confident, the
rhythm is regular, and the value is **consistent with any PTB-XL rate label**
(SBRAD ⇒ <60, STACH ⇒ >100, otherwise 55–105 for NORM/SR). Answer is rounded to
5 bpm. Ingest self-check reported 0/362 inconsistent.
**Why review:** the detector is intentionally simple; confirm the ±5 bpm rounding
and the option spread (±20/±40) are acceptable, and that measuring from lead II
is fine. Irregular rhythms (AF) never get a single-value rate question.

### 14. 🔲 Computed QRS-axis questions
**Where:** `features.ts` `estimateAxis`, `generate.ts` `tAxis`.
**Decision made:** Axis quadrant is inferred from the sign of the mean net QRS
deflection in leads I and aVF around detected R peaks. A question is emitted only
when confident AND the computed quadrant **agrees with PTB-XL's `heart_axis`**
column (when that column is populated). Four-quadrant answer only (normal / LAD /
RAD / extreme), not degrees.
**Why review:** confirm the four-quadrant simplification and the net-deflection
method are acceptable for teaching; borderline axes are the main risk (mitigated
by the label cross-check and a confidence threshold).

### 15. 🔲 "Which finding is present?" relies on PTB-XL label completeness
**Where:** `generate.ts` `tWhichFinding`.
**Decision made:** The correct option is a finding **labelled present** on the
record (other than the type's own primary label, so it tests a *concurrent*
finding); distractors are findings **not labelled** on the record. The
explanation says the distractors are "not present."
**Why review:** this assumes PTB-XL's labels are complete — i.e. an unlabelled
finding is truly absent. If a distractor finding were present but unlabelled, the
"not present" claim would be wrong. Confirm this assumption is acceptable, or we
should soften the wording to "not among the labelled findings."

### 16. 🔲 Infarct-territory questions
**Where:** `generate.ts` `tTerritory` (restricted to MI-superclass records).
**Decision made:** Territory (inferior/anterior/anteroseptal/lateral/posterior)
is taken from the MI location code; the explanation cites the standard lead group.
**Why review:** confirm the lead-group → territory mapping used in explanations.

### 17. 🔲 Difficulty-tier assignments
**Where:** `scripts/ingest/labels.ts` (`tier` per SCP code).
**Decision made:** Every SCP code is tagged foundational/intermediate/advanced/
expert. This is a pedagogical ordering choice, not a clinical fact.
**Why review:** sanity-check the tiering (e.g. WPW/DIG/LNGQT = expert; bundle
branch blocks = intermediate; specific MI territories = advanced).

---

## Phase 1 — data pipeline & initial curriculum

### 1. 🔲 "STEMI" label derivation from PTB-XL
**Where:** `scripts/ingest/taxonomy.ts` — `stemi` type `match()`.
**Decision made:** A record is treated as a STEMI *pattern* when its
`infarction_stadium1` is an acute/recent stage (`Stadium I`, `Stadium I-II`,
`Stadium II`) **and** it carries an MI location code (IMI/AMI/ASMI/…) or an
injury/ST-elevation code (INJ*/STE_).
**Why it needs review:** PTB-XL does not carry an explicit "STEMI vs NSTEMI"
label. Infarction stage is an ECG-morphology inference, and an acute MI is not
necessarily an ST-elevation MI. Some selected tracings may be NSTEMI or
non-acute. **Question:** Is the acute-stage + injury/location heuristic an
acceptable proxy for teaching the *STEMI pattern*, or should selection require
an explicit ST-elevation code (`STE_`/`INJ*`) in ≥2 contiguous leads?
**Current mitigation:** The type is titled "ST-elevation MI **(pattern)**",
copy states the diagnosis of acute STEMI is clinical, and the disclaimer is
persistent.

### 2. 🔲 Exact ST-elevation millimeter criteria omitted from the lesson
**Where:** `stemi` lesson (`keyFacts`).
**Decision made:** Lesson states "ST elevation in ≥2 contiguous leads" without
the sex/age/lead-specific millimeter thresholds (e.g. ≥1 mm limb leads; ≥2 mm
[men] / ≥1.5 mm [women] in V2–V3, per the Fourth Universal Definition of MI).
**Why it needs review:** The general statement is correct but incomplete.
**Question:** Should the precise thresholds be taught at this level, or is the
simplified "≥2 contiguous leads" appropriate for an introductory module?

### 3. 🔲 Normal-sinus selection uses NORM likelihood ≥ 80
**Where:** `sinus-rhythm` `match()`.
**Decision made:** A record counts as clean normal sinus rhythm when `SR` is
present, `NORM` likelihood ≥ 80, and no abnormal diagnostic or non-sinus rhythm
codes are present.
**Why it needs review:** The 80 likelihood cutoff is a judgment call to exclude
borderline tracings. **Question:** Is ≥80 appropriately conservative?

### 4. 🔲 PTB-XL likelihood value of 0.0 treated as "statement asserted"
**Where:** `parseScp()` + all `match()` predicates.
**Decision made:** We treat the *presence* of an SCP code key as the statement
applying (PTB-XL frequently records a likelihood of `0.0`, meaning "asserted but
not quantified"), except where an explicit likelihood threshold is used
(item 3).
**Why it needs review:** Confirm this matches intended PTB-XL semantics for a
teaching context.

### 5. 🔲 First-degree AV block co-occurring findings
**Where:** `first-degree-av-block` `match()`.
**Decision made:** Requires `1AVB` and excludes `2AVB`/`3AVB`, but permits other
co-occurring abnormalities. The question asks the learner to identify 1° AVB
specifically.
**Why it needs review:** Some selected tracings may have additional prominent
findings (e.g. bundle branch block) that could make "first-degree AV block" not
the single best answer. **Question:** Should selection exclude records with
other conduction/MI findings to keep the answer unambiguous?
**Update (Phase 5):** selection now also excludes AF/flutter records for the
conduction types, reducing (not eliminating) this ambiguity.

---

## Phase 5 — expanded curriculum (8 new types)

The curriculum grew from 4 to 12 types across modules (Rhythm, Conduction,
Chambers, Ischemia). New selection logic keeps rhythm types mutually exclusive
and excludes AF/flutter + acute-MI records from the morphology types. Items
below are the content decisions a clinician should verify.

### 6. 🔲 PVC is a *beat*, not a sustained rhythm
**Where:** `pvc` type. **Decision:** the question asks the learner to identify
the *ventricular premature complex(es)* present on the tracing, and the lesson
states explicitly that PVCs are ectopic beats on an underlying rhythm.
**Why review:** a record labelled `PVC` also has an underlying rhythm (usually
sinus); "PVC" is the correct *finding* but not the whole rhythm diagnosis.
**Question:** is framing PVC as the answer acceptable, or should the stem ask
"what additional finding is present?"

### 7. 🔲 LVH voltage criteria — which set, and thresholds
**Where:** `lvh` lesson `keyFacts`. **Decision:** teaches Sokolow–Lyon
(S V1 + R V5/V6 > 35 mm) and R in aVL > 11 mm as representative criteria, plus
lateral strain. **Why review:** many voltage criteria exist (Cornell, Romhilt–
Estes point score, etc.) with different thresholds and sex adjustments; tall
voltage also occurs in healthy thin/young people. **Question:** are these the
right criteria to teach at intro level, and are the numeric thresholds correct
for your reference?

### 8. 🔲 LBBB can mask/mimic acute MI
**Where:** `lbbb` lesson + selection. **Decision:** LBBB selection *excludes*
acute-stage MI records (to avoid mislabelling a STEMI as plain LBBB), and the
lesson carries an explicit caveat that new LBBB can mask MI (Sgarbossa context
not taught yet). **Why review:** confirm the caveat wording is adequate and that
excluding acute-MI records is the right call for teaching examples.

### 9. 🔲 LAFB axis criteria vs PTB-XL label
**Where:** `lafb`. **Decision:** lesson teaches marked left-axis deviation
(≈ −45° to −90°), qR in I/aVL, rS inferiorly, near-normal QRS width. Selection
trusts the PTB-XL `LAFB` label rather than re-deriving the axis from the signal.
**Why review:** confirm the axis range taught and whether we should cross-check
against the dataset's `heart_axis` column (LAD/ALAD) for selection.

### 10. 🔲 RBBB/LBBB "complete" vs incomplete
**Where:** `rbbb`/`lbbb` use `CRBBB`/`CLBBB` (complete) only, excluding
`IRBBB`/`ILBBB` (incomplete). **Why review:** confirm teaching complete blocks
only at this stage is appropriate; incomplete blocks (QRS 110–120 ms) are a
separate teaching point deferred to a later module.

### 11. 🔲 Sinus brady/tachy rate thresholds
**Where:** `sinus-bradycardia` (<60), `sinus-tachycardia` (>100). **Decision:**
standard adult thresholds; selection trusts the PTB-XL `SBRAD`/`STACH` labels
rather than measuring rate from the signal. **Why review:** confirm thresholds
and that label-based selection (vs measured rate) is acceptable.

### 12. 🔲 Atrial flutter conduction ratio / rate statement
**Where:** `atrial-flutter` lesson. **Decision:** teaches atrial rate 250–350,
saw-tooth F waves best in II/III/aVF, and the "2:1 ≈ 150 bpm" heuristic.
**Why review:** confirm the rate ranges and that the typical-flutter (negative
inferior F waves) description is appropriate given atypical flutter also exists.
Only 73 flutter records exist in PTB-XL — a smaller bank than other types.
