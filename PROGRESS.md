# PROGRESS

Running log of what changed each phase and what needs your review.

---

## Phase 1 — Data pipeline ✅ (awaiting your review)

### What was built
- **Project scaffold:** Next.js 16 (App Router) + TypeScript + Tailwind, SQLite
  via Prisma. Single deployable app. (`package.json`, `tsconfig.json`,
  `next.config.mjs`, `tailwind.config.ts`, `prisma/schema.prisma`)
- **Data model** (`prisma/schema.prisma`): `EcgType`, `Lesson`, `Record`
  (waveform), `Question`, plus per-user progress: `User`, `TypeProgress`,
  `QuestionState` (SM-2 spaced-repetition fields), `Attempt`.
- **WFDB reader** (`scripts/ingest/wfdb.ts`): reads individual `.hea`/`.dat`
  records **directly from the 1.7 GB PhysioNet zip via random access** (yauzl,
  `autoClose:false`) — the archive is never unpacked or loaded into memory.
  Verifies format-16 + uniform gain/baseline; stores the raw Int16 signal
  faithfully.
- **Curated taxonomy** (`scripts/ingest/taxonomy.ts`): maps PTB-XL SCP codes to
  teachable ECG types with selection predicates, distractor groups, and
  **originally-authored** lesson content (sections + key facts). Nothing scraped.
- **Ingestion** (`scripts/ingest/index.ts`): parses `ptbxl_database.csv`, buckets
  records by type (first-match, disjoint), takes a deterministic balanced sample,
  decodes each waveform, and authors one identification question per record with
  distractors from sibling type labels. Seeds SQLite.
- **App shell**: persistent "not for clinical diagnosis" disclaimer in the
  layout; a home page that lists the seeded curriculum from the DB (proves the
  pipeline end-to-end). Light/dark scaffolding in place (full toggle in Phase 4).
- **Docs:** `CLAUDE.md`, `ATTRIBUTION.md` (PTB-XL CC-BY), `REVIEW.md`.

### Initial curriculum (4 types, matching Phase 3 target)
| Type | Candidates in PTB-XL | Questions seeded |
|------|----------------------|------------------|
| Normal sinus rhythm | 7060 | 24 |
| Atrial fibrillation | 1497 | 24 |
| First-degree AV block | 784 | 24 |
| STEMI (pattern) | 192 | 24 |

**96 questions / 96 real waveforms.** Verified: build passes, app renders,
lead II of a sample decodes to ~1.04 mV peak-to-peak (physiological).

### Commands
- `npm run ingest` — (re)build the bank. `npm run db:reset` — reset + reseed.
- `npm run dev` / `npm run build` — run / build the app.
- Node runs via a portable install at `C:\Users\georg\AppData\Local\nodejs-portable`
  (added to your user PATH), since no system Node was present.

### ⚠️ Needs your review before Phase 2
1. **STEMI selection is a heuristic** (acute infarction stage + MI/injury code),
   because PTB-XL has no explicit STEMI/NSTEMI label. See `REVIEW.md` item 1.
   → *Decision needed: accept the heuristic, or require explicit ST-elevation
   codes?*
2. **Lesson depth for STEMI** omits precise mm criteria (`REVIEW.md` item 2).
3. **SCP likelihood semantics** (treating `0.0` as "asserted"; NORM ≥80 cutoff)
   — `REVIEW.md` items 3–4.
4. **1° AVB examples** may carry co-findings (`REVIEW.md` item 5).
5. Sample size is **24/type** for now — trivially scalable in Phase 5.

See `REVIEW.md` for the full clinician queue.

---

## Phase 2 — Waveform renderer ✅ (awaiting your review)

### What was built
- **`EcgCanvas`** (`src/components/EcgCanvas.tsx`) — the accurate `<canvas>`
  renderer. Everything is drawn in **millimetre coordinates** (the context is
  scaled by pixels-per-mm × devicePixelRatio), so the grid and trace are always
  spatially calibrated: 25 mm/s and 10 mm/mV are physically truthful, and the
  backing resolution is just zoom. Features:
  - Proper **ECG paper grid** — 1 mm minor + 5 mm major squares, pink in light
    mode, subtle red in dark mode.
  - **1 mV calibration pulse** in the left gutter of every track (height tracks
    the selected gain).
  - **Classic 3×4 layout** (I/aVR/V1/V4 · II/aVL/V2/V5 · III/aVF/V3/V6), each
    cell a continuous 2.5 s window, plus a **full 10 s lead-II rhythm strip** —
    the layout you chose.
  - **Stacked 12-lead layout** as an alternate (useful for lead-focused STEMI
    teaching).
  - Per-track clipping so tall complexes don't bleed between rows; lead labels;
    optional **lead spotlight** (diagnostic lead drawn in accent colour).
  - Live **redraw on theme toggle** (MutationObserver) and on resize/DPR change.
- **`EcgViewer`** (`src/components/EcgViewer.tsx`) — control bar: paper speed
  (25/50 mm/s), gain (5/10/20 mm/mV), layout toggle, and spotlight toggle.
- **`src/lib/ecg.ts`** — dependency-free base64→per-lead-mV decoder (runs in the
  browser), lead-name normalisation (AVR→aVR), and layout/calibration constants.
- **Preview page** (`/preview`) — one real tracing per type on the calibrated
  grid, to eyeball the renderer.

### Verified (in a real browser via the preview harness)
- Canvas geometry is exactly right (263 mm × 121 mm at 3 px/mm).
- Sinus, AF, 1° AVB, STEMI tracings all render with clear P-QRS-T morphology.
- Controls respond (speed widens the trace, gain scales amplitude + pulse),
  3×4 ↔ stacked switch works, and dark mode redraws correctly.

### ⚠️ Notes for your review
- Amplitude is **not clipped to a fixed track height** beyond a soft per-row
  clip; at 20 mm/mV very large complexes can touch the neighbouring row. This is
  expected behaviour (lower the gain), but tell me if you'd prefer hard scaling.
- No paper-scroll/animation ("sweep") yet — the full 10 s is shown statically,
  as on a printout. Easy to add if you want a live-sweep mode.
- Renderer is presentational and ready to drop into the Phase 3 quiz.

---

## Phase 3 — Learning engine ✅ (awaiting your review)

The full **lesson → unlock → practice → mastery** loop is built and verified
end-to-end in the browser.

### Decisions I made (autonomously, per your ask)
- **Sequential progression:** a type's lesson opens only once the previous type
  (by curriculum order) is unlocked. NSR → AF → 1° AVB → STEMI. Locked types show
  "Complete previous lesson".
- **Unlock = bank population:** finishing a lesson flips `TypeProgress.unlocked`
  and creates a `QuestionState` per question (all due immediately). Practice only
  ever draws from unlocked types — the bank is genuinely "personal".
- **Spaced review (SM-2):** wrong answers reset the card and recirculate it in
  ~1 min (in-session relearn); correct answers graduate 1 day → 6 days →
  interval × ease. Fast-correct (<6 s) grades higher.
- **Scheduler:** serves the most-overdue due card first; when nothing is due it
  offers "practice ahead" (soonest-due card) and flags it in the UI.
- **Mastery = 0.5·retention + 0.3·accuracy + 0.2·coverage** (0–1), recomputed on
  every answer; "★ Mastered" at ≥0.8 with full coverage.

### What was built
- **SRS + mastery** pure logic (`src/lib/srs.ts`).
- **Server actions** (`src/app/actions.ts`): `unlockType`, `submitAnswer`
  (grade → schedule → log attempt → recompute mastery), `fetchNextQuestion`
  (due-first scheduler with practice-ahead).
- **Read queries** (`src/lib/queries.ts`): curriculum, lesson, dashboard.
- **Pages:** curriculum home (unlock state, mastery bars, gating), lesson page
  (`/learn/[id]` with example tracing + key facts + unlock), practice
  (`/practice`, optional `?type=`), progress dashboard (`/dashboard`).
- **Quiz** (`src/components/Quiz.tsx`): waveform + 4-option MCQ, immediate
  feedback with the authored explanation + live mastery, **keyboard-driven**
  (1–4 to pick, Enter to check/advance), session accuracy, diagnostic-lead
  spotlight revealed after answering.
- **Nav + dark-mode toggle** in the layout; `npm run progress:reset` to clear
  progress while keeping content.

### Verified in-browser (full walk-through)
Unlocked NSR → practiced → correct answer showed green highlight + explanation +
mastery 31% → "due" dropped 24→23 (card scheduled forward) → dashboard showed
1/4 unlocked, 100% accuracy, per-type mastery bar. Wrong answer showed "Not
quite". Keyboard select + submit confirmed. Progress reset to a clean slate for
your review.

### ⚠️ Notes for your review
- Only the 4 seeded types exist yet (Phase 5 scales the curriculum).
- Single local user (`id: "local"`) — no auth, as intended for a personal study
  app. Multi-user would need a session layer.
- SM-2 lapse interval (60 s in-session) is a study-UX choice; tell me if you'd
  prefer a different relearn cadence.

---

## Phase 4 — UX polish ✅ (awaiting your review)

Focused on making the app feel slick and responsive, with tasteful motion that
respects `prefers-reduced-motion`.

### Micro-interactions & motion
- **Universal press feedback** — every button/`[role=button]` scales down
  slightly on press (global CSS), so the whole UI feels tactile.
- **Quiz answer reveal** — the correct option **pops**, a wrong pick **shakes**,
  non-answers **dim**, and check/✗ marks **pop in**. Correct feedback panel gives
  a soft green **success pulse**.
- **Animated question transitions** — each new card fades/slides up.
- **Animated mastery bars** (`AnimatedBar`) grow from 0 with an easing curve on
  the dashboard, curriculum, and in-quiz feedback.
- **Selected option** gets a ring + glow and a filled key badge; **staggered
  entrance** on curriculum cards, dashboard stats, and lesson sections.
- Card **hover-lift** shadows; smooth **theme cross-fade** on light/dark switch.

### Flow & clarity
- **Keyboard-first quiz**: 1–N to choose, Enter to check/advance, with an inline
  key-hint and auto-focused "Next card". Clear `:focus-visible` rings throughout.
- **Sticky, blurred header** with a waveform-glyph wordmark and an **active-route
  underline indicator** (`NavLinks`).
- Refined "all caught up" and feedback states; thin custom scrollbars for the
  wide ECG canvas.

### Themes
- Both light and dark refined and verified in-browser across curriculum, lesson,
  practice (correct + incorrect states), and dashboard. Dark mode persists via
  `localStorage` with a no-flash init script.

### Verified in-browser
Walked the full flow in both themes: unlock → select (ring/glow) → correct
(green pop + animated mastery bar to 31%) → wrong (rose shake + drop to 17%) →
dashboard (animated stats + bars). All motion is `motion-safe:` gated.

### Notes
- No new medical content changed in this phase — purely presentation/interaction.

---

## Phase 5 — Scale the curriculum ✅ (awaiting your review)

Grew the curriculum from **4 → 12 types** and the bank from **96 → 360 questions**,
all auto-generated from PTB-XL. Everything uncertain went to `REVIEW.md`.

### New curriculum (12 types, 5 modules)
| Module | Types |
|--------|-------|
| Foundations | Normal sinus rhythm |
| Rhythm | Sinus bradycardia, Sinus tachycardia, Atrial fibrillation, Atrial flutter, Ventricular premature complexes |
| Conduction | First-degree AV block, RBBB, LBBB, LAFB |
| Chambers & hypertrophy | Left ventricular hypertrophy |
| Ischemia & infarction | STEMI (pattern) |

Each type: an **originally-authored lesson** (sections + identifying criteria) and
**30 questions** on real PTB-XL waveforms. Distractors are same-module confusables
(e.g. RBBB vs LBBB vs LAFB vs 1° AVB; AF vs flutter vs sinus tachy).

### Selection refinements (to keep examples clean)
- Rhythm types are **mutually exclusive** (a record can't be both AF and sinus tachy).
- Conduction/chamber types **exclude AF/flutter and acute-MI records**, so the
  primary teaching feature is unambiguous. LBBB/LVH also exclude acute-stage MI so
  a real STEMI is never mislabelled.
- First-match disjoint bucketing (lowest `order` wins) keeps buckets non-overlapping.

### UX
- Curriculum home now **groups types into modules** with per-module progress
  (e.g. "2/6"), keeping the sequential unlock order intact.

### Verified in-browser (all types unlocked via a dev script, then reset)
- Curriculum renders 5 modules / 12 types in order.
- NSR question → rhythm-module distractors; RBBB question → conduction-module
  distractors; RBBB graded correct with its authored explanation (rSR′, slurred S,
  etc.). Waveforms decode to physiological amplitudes. Build clean; 360 records.

### Candidate pool sizes (PTB-XL)
NSR 7060 · S.Brady 635 · S.Tachy 821 · AF 1497 · **Flutter 73** · PVC 842 ·
1° AVB 633 · RBBB 323 · LBBB 308 · LAFB 1054 · LVH 1368 · STEMI 159.
Atrial flutter is the smallest pool (73) but still fills a 30-question bank.

### ⚠️ For your review — see `REVIEW.md` items 6–12
PVC-as-finding-not-rhythm, LVH voltage-criteria choice, LBBB-masks-MI caveat,
LAFB axis criteria, complete-vs-incomplete blocks, brady/tachy thresholds, and
flutter rate/conduction statements — all handled conservatively, all flagged.

### Dev utilities
- `scripts/dev-unlock-all.ts` — unlock every type locally (for testing practice).
- `npm run progress:reset` — clear progress, keep content.

---

# ROUND 2 — growing bank, spaced repetition, deployability

## R2 Phase 1 — Full-SCP generator ✅

Rebuilt the question generator to scale the bank and add hard/niche variety.

### What changed
- **Full SCP registry** (`scripts/ingest/labels.ts`): all 71 PTB-XL SCP
  statements with human names, category (rhythm/form/diagnostic), best-fit
  superclass, a **difficulty tier**, and a one-line factual descriptor. Every
  code can now appear as an answer, a distractor, or a "finding present" option.
- **6 new data-backed types** (18 total): sinus arrhythmia, atrial premature
  complexes, paced rhythm, RVH, left atrial enlargement, ischemic ST–T changes —
  each with an authored lesson.
- **Signal features** (`scripts/ingest/features.ts`): a lightweight R-peak
  detector → ventricular **rate**, and net-QRS-in-I/aVF → frontal **axis**.
- **Multi-template generator** (`scripts/ingest/generate.ts`), 6 question kinds:
  `identify`, `which-finding` (concurrent finding on multi-label ECGs), `rate`,
  `axis`, `territory` (MI only), `lead`. **Every question explains why the answer
  is right and why the distractors are wrong.**
- **Accuracy guard:** computed rate/axis answers are emitted **only when they
  agree with PTB-XL's own labels** (rate vs SBRAD/STACH/NORM; axis vs
  `heart_axis`). Ingest self-check: 0/362 rate questions inconsistent.
- **Difficulty tiers** tagged on every question (foundational→expert).
- **Waveforms downsampled to 250 Hz** at ingest (halves storage for the hosted
  DB in Phase 4; the renderer already reads `fs`, so it's visually unchanged).
- **Balance/dedupe:** per-type caps per question kind; one question per
  (record, kind) so no exact duplicates; variety comes from distinct waveforms.

### Result
**1,735 questions** (from 360) across **18 types** and **6 kinds**, distributed
foundational 469 / intermediate ~765 / advanced ~730 / expert 5.
By kind: identify 540 · which-finding 357 · rate 362 · axis 252 · lead 204 ·
territory 20. 789 real waveform records.

### Schema
`Question` gained `kind`, `tier`, `labels`, `topic`, `authored`, and a **nullable
`recordId`** (for authored waveform-free items in Phase 3). `EcgType` gained
`tier`. App code updated to render record-less questions.

### Verified
Build clean; verify.ts sampled every kind (explanations read well, distractors
plausible); rate cross-check 0 inconsistent; downsample confirmed (fs 250,
2500 samples); in-browser the quiz served identify/axis/lead/rate questions and
graded them correctly.

### ⚠️ For clinician review — REVIEW.md items 13–17
Computed-rate method, computed-axis method, the "which-finding ⇒ others absent"
label-completeness assumption, territory lead-mapping, and the tier assignments.

## R2 Phase 2 — FSRS, interleaving, Free Practice, dashboard ✅

Turned the ordered course into an open, self-paced growing bank with real spaced
repetition.

### Spaced repetition (FSRS)
- Integrated **ts-fsrs** (FSRS-5). `src/lib/fsrs.ts` wraps it: maps our
  `QuestionState` ↔ FSRS `Card`, maps an MCQ result to a rating (wrong→Again,
  correct→Good, fast→Easy, slow→Hard), and exposes **predicted recall**.
- `QuestionState` now stores the full FSRS card (stability, difficulty, reps,
  lapses, state, due, …). `submitAnswer` schedules via FSRS.

### Cumulative, interleaved review (the key mechanic)
- Learning a type adds its questions to the bank **permanently**. Review
  (`/practice`) now **interleaves across everything unlocked**, not just the
  newest type. Verified: 4 consecutive cards spanned 4 different types.
- Selection is **weighted**: due items strongly preferred; **weak types**
  (low mastery) and **fragile items** (low stability) up-weighted; the same type
  twice in a row is down-weighted so old and new material mix.

### Free Practice mode
- New `/free` page: self-paced drilling across the whole bank, **no due gating**,
  weak items first. Filter chips by **difficulty tier** and **question kind**.
  Verified filters work (e.g. `kind=rate` serves only rate questions).

### Self-paced library
- Home is now a **hub + library**: action cards (Review due / Free practice /
  Continue course) plus every type learnable **in any order** (sequential gating
  removed; the course order is now just a "Suggested next" hint).

### Mastery dashboard
- Added **Focus here (weakest)** and **Strengths** (by mastery), **accuracy by
  difficulty tier**, **bank size**, and **FSRS predicted recall**. Verified the
  weak-areas list and tier breakdown populate from real attempts.

### Plumbing
- `src/lib/user.ts` `getUserId()` centralises identity (returns "local" now;
  Phase 4 swaps it for the auth session — no query changes needed then).

### Verified
Build clean (routes: /, /practice, /free, /dashboard, /learn, /preview); FSRS
grading persists; interleaving, free-mode filters, library, and dashboard
analytics all confirmed in-browser via DOM/interaction (screenshot tool was
flaky this session, so verification was functional rather than visual).

## R2 Phase 3 — Niche / advanced content ✅

Broadened coverage into harder and niche territory. **26 types now** (22
data-backed + 4 authored), still ~1,968 questions.

### Data-backed niche types (real PTB-XL waveforms + lessons)
- **WPW / pre-excitation** (79 records) — short PR, delta wave.
- **Long QT** (117) — QTc thresholds, torsades risk.
- **Second-degree AV block** (Mobitz I vs II) and **Third-degree AV block**
  (AV dissociation) — small real-record banks (6 and 4), so supplemented by their
  lessons; flagged.

### Authored expert content (waveform-free "concept" questions)
For patterns PTB-XL underrepresents, authored originally from standard criteria
(`scripts/ingest/authored.ts`), each in a new **"Expert patterns"** module:
- **Brugada**, **Wellens**, **De Winter**, **Hyperkalaemia** — a lesson + 2–3
  concept questions each (11 authored questions). Each explanation says why the
  answer is right and why the distractors (common mimics) are wrong.
- Stored with `authored=true`, `kind="criteria"`, `recordId=null`, `tier=expert`.
  The quiz renders these with a "Concept question — no tracing" panel instead of a
  waveform. New **Concept** filter added to Free Practice.

### Verified in-browser
The Brugada concept question renders without a canvas, grades correctly, and its
explanation contrasts the coved pattern against pericarditis/saddleback. All 7
modules (incl. Expert patterns) and all 8 new types appear in the library.

### ⚠️ Clinician review — REVIEW.md items 18–21
Every authored niche lesson + question (Brugada / Wellens / De Winter /
hyperkalaemia) is flagged for sign-off before it should be treated as
authoritative.
