# ECG Learn — Project Guide

A web app that teaches ECG interpretation progressively. Study one ECG type at a
time (a short lesson), which **unlocks** that type and adds its questions to your
personal practice bank. Drill from your unlocked bank with immediate feedback and
spaced-repetition review. Mastery is tracked per type.

## Absolute rules (do not violate)

1. **Medical EDUCATION only.** A persistent "Not for clinical diagnosis"
   disclaimer must be visible on every screen.
2. **Licensed content only.** Real waveforms come from **PTB-XL (CC-BY 4.0)**.
   Render tracings by plotting the raw signal arrays — **never** scraped images.
   Attribute PTB-XL per CC-BY (see `ATTRIBUTION.md`).
3. **No scraping** of copyrighted sites, question banks, or textbooks. Practice
   questions are authored **originally** from standard factual ECG knowledge.
4. **Accuracy matters.** Where a fact is ambiguous, log it to `REVIEW.md` for a
   clinician to verify rather than guessing.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS** — single deployable app.
- **SQLite via Prisma** — questions + user progress.
- **Waveforms** rendered on `<canvas>` from PTB-XL signal arrays (WFDB format).

## Data

PTB-XL metadata is staged at `./data/ptb-xl/` (`ptbxl_database.csv`,
`scp_statements.csv`, `LICENSE.txt`, `RECORDS`). The full waveform archive (the
`records500/` tree) lives in the source zip under `../Claude/`; the ingestion
script reads the specific `.dat`/`.hea` records it needs directly from that zip
so we never unpack 1.7 GB.

### WFDB format (as used by PTB-XL `records500`)
- Header `.hea`: `record nsig fs nsamp` → 12 leads, 500 Hz, 5000 samples (10 s).
- Signal lines: `format16`, gain `1000 ADU/mV`, baseline 0, adc_zero 0.
- `.dat`: 16-bit signed little-endian, **interleaved** across leads
  (sample0_lead0…sample0_lead11, sample1_lead0…). mV = raw / 1000.
- Lead order: I, II, III, aVR, aVL, aVF, V1–V6.

### SCP labels
`scp_codes` column is a dict `{code: likelihood}`. `scp_statements.csv` maps each
code to `diagnostic_class` (NORM/MI/STTC/CD/HYP), `diagnostic_subclass`, and
`rhythm`/`form`/`diagnostic` flags. Our curated taxonomy
(`scripts/ingest/taxonomy.ts`) groups SCP codes into teachable **ECG types**.

## Ingestion pipeline

`scripts/ingest/` — run with `npm run ingest`:
1. Parse `ptbxl_database.csv` + `scp_statements.csv`.
2. Assign each record to a curated ECG type (taxonomy) when its labels match
   with sufficient likelihood.
3. Pick a balanced sample per type; extract each record's 12-lead signal from the
   zip, decode to mV arrays, store as compact JSON.
4. Generate identification questions: show a real waveform, ask the rhythm/
   diagnosis, distractors drawn from sibling labels in the same superclass.
5. Seed SQLite via Prisma.

## Commands
- `npm run dev` — start the app.
- `npm run ingest` — (re)build the question bank from PTB-XL.
- `npm run db:reset` — reset + reseed the database.

## Conventions
- Keep clinical copy factual and hedge-free only where the fact is settled.
  Anything uncertain → `REVIEW.md`, never guessed into the UI.
- All ECG facts in lessons/questions should be traceable to standard references
  (rate/rhythm/interval criteria); cite the criterion, not a copyrighted source.
