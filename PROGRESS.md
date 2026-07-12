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
