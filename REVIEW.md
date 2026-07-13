# Clinician Review Queue

Items below are content or data-mapping decisions that need verification by a
qualified clinician before being treated as authoritative. Each is currently
handled conservatively in code/copy; this list exists so nothing ambiguous is
silently presented as fact.

Status key: 🔲 unreviewed · ✅ verified · ✏️ needs edit

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
