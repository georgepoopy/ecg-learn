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
