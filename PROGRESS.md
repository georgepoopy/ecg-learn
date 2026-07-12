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
