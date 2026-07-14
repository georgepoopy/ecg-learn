# Data Sources & Licenses

Every waveform in this app comes from an **openly licensed** dataset whose
license we have verified and recorded here. We render tracings only by plotting
the **raw digital signal arrays** — never scraped or copied images — and we do
**not** scrape ECGs, cases, or questions from the web, textbooks, or question
banks. All lessons, questions, distractors, and explanations are **authored
originally** from standard factual ECG criteria.

If a dataset's license cannot be verified, it is **not ingested** — it is listed
below as skipped.

---

## Ingested

### 1. PTB-XL — Physikalisch-Technische Bundesanstalt, Germany
- **License:** Creative Commons Attribution 4.0 International (**CC-BY 4.0**). ✅
- **Records used:** subset of the 21,799 twelve-lead records (SCP-ECG labels).
- **Citation / attribution:**
  > Wagner, P., Strodthoff, N., Bousseljot, R.-D., Kreiseler, D., Lunze, F. I.,
  > Samek, W., & Schaeffter, T. (2020). *PTB-XL, a large publicly available
  > electrocardiography dataset* (v1.0.3). PhysioNet.
  > https://doi.org/10.13026/kfzx-aw45 — Scientific Data 7, 154.
  > Goldberger et al. (2000), *PhysioBank/PhysioToolkit/PhysioNet*, Circulation 101(23).
- **License file:** `data/ptb-xl/LICENSE.txt`.

### 2. Chapman-Shaoxing & Ningbo — "A large scale 12-lead ECG database for arrhythmia study"
- **License:** Creative Commons Attribution 4.0 International (**CC-BY 4.0**). ✅
  (Verified on the PhysioNet dataset page, license stated verbatim as
  "Creative Commons Attribution 4.0 International Public License".)
- **Source:** Chapman University, Shaoxing People's Hospital, and Ningbo First
  Hospital. PhysioNet "ecg-arrhythmia" v1.0.0.
- **Format:** WFDB `.hea` + MATLAB `.mat` (12-lead, 500 Hz, 10 s), diagnoses as
  **SNOMED-CT** codes on the `#Dx:` header line; `ConditionNames_SNOMED-CT.csv`
  maps SNOMED → acronym → condition name.
- **How we use it:** a **bounded, deterministic subset** is downloaded directly
  from PhysioNet (`scripts/fetch/chapman.ts`) into `data/chapman-shaoxing/`. Only
  records whose SNOMED labels map with **high confidence** to our unified
  taxonomy are ingested (see mapping caveats below).
- **Citation / attribution:**
  > Zheng, J., Guo, H., & Chu, H. (2022). *A large scale 12-lead
  > electrocardiogram database for arrhythmia study* (v1.0.0). PhysioNet.
  > https://doi.org/10.13026/wgex-er52
  > Zheng, J., Chu, H., Struppa, D., et al. (2020). *Optimal Multi-Stage
  > Arrhythmia Classification Approach.* Scientific Reports 10.
- **License file:** `data/chapman-shaoxing/LICENSE.txt`.

---

## Available under the same collection (CinC 2021), adapter-ready

The **PhysioNet/CinC Challenge 2021** collection
(https://physionet.org/content/challenge-2021/) states its files are licensed
**CC-BY 4.0**, and bundles: CPSC & CPSC-Extra, Georgia (G12EC), PTB/PTB-XL,
St Petersburg INCART, Chapman-Shaoxing & Ningbo, plus undisclosed sets. All use
the same WFDB `.hea` + `.mat` + SNOMED-CT `#Dx:` format that our Chapman adapter
already parses.

- **CPSC / CPSC-Extra** (China) — CC-BY 4.0 per the CinC-2021 distribution.
  *Note:* the original China Physiological Signal Challenge 2018 terms are not
  independently re-verified here; we rely on the CinC-2021 CC-BY 4.0
  redistribution. Adapter-ready; not yet ingested.
- **Georgia / G12EC** (Emory) — CC-BY 4.0 per the CinC-2021 distribution.
  Adapter-ready; not yet ingested.

To ingest any of these, stage them under `data/<name>/` in the same WFDB+`.mat`
layout and add a source entry to the ingestion config — the `.mat` reader and
SNOMED→taxonomy mapping are shared.

---

## SNOMED → taxonomy mapping caveats (→ REVIEW.md)

- **MI-family SNOMED codes** (e.g. 164865005 "myocardial infarction" and its
  wall variants) do **not** encode acuity, so they are **not** mapped to our
  acute-STEMI type — mapping them would mislabel old/indeterminate MI as an acute
  ST-elevation pattern. They are skipped pending a dedicated "prior MI / Q-wave"
  type. (REVIEW.md)
- The three left-bundle variants (LBBB/LBBBB/LFBBB) share one SNOMED code
  (164909002) in this dataset, so fascicular subtypes cannot be distinguished
  from the code alone; all map to LBBB. (REVIEW.md)
- Rare rhythms without a corresponding teachable type yet (AVNRT, AVRT,
  junctional beats, wandering pacemaker, U waves, etc.) are carried as
  recognised-but-unmapped and are **not** turned into questions. (REVIEW.md)

---

## Explicitly NOT used
- **`The-ECG-Made-Easy-9th-Edition.pdf`** (present in the source folder) is a
  **copyrighted textbook** and is **not** a content source.
- **No web scraping.** No ECG images, cases, or questions are taken from
  websites, textbooks, or question banks.
