/**
 * PTB-XL ingestion pipeline (round-2 generator).
 *
 *   1. Parse ptbxl_database.csv.
 *   2. Assign each record to a curated ECG type (first-match, disjoint buckets).
 *   3. For a balanced sample per type, read the 12-lead signal from the zip,
 *      downsample to 250 Hz (deploy-friendly, visually lossless at 25 mm/s),
 *      compute rate/axis features, and generate a varied, tiered, deduped set of
 *      questions (see generate.ts).
 *   4. Balance question kinds per type so the bank isn't all "identify".
 *   5. Seed the database via Prisma.
 *
 * Run: `npm run ingest`
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { makePrisma } from "../db";
import { ZipReader, readRecord, parseHeader } from "./wfdb";
import { readMat } from "./mat";
import { TYPES, typeTier, type PtbRow, type ScpMap } from "./taxonomy";
import { TIER_RANK } from "./labels";
import { decodeLeads } from "./features";
import { generateForRecord, type GenQuestion } from "./generate";
import { AUTHORED_TYPES, AUTHORED_QUESTIONS } from "./authored";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data", "ptb-xl");
const CSV_PATH = path.join(DATA_DIR, "ptbxl_database.csv");

const ZIP_PATH = path.resolve(
  PROJECT_ROOT,
  "..",
  "Claude",
  "ptb-xl-a-large-publicly-available-electrocardiography-dataset-1.0.3.zip",
);
const ZIP_INNER_PREFIX =
  "ptb-xl-a-large-publicly-available-electrocardiography-dataset-1.0.3/";

/** How many records to consider per type. */
const RECORDS_PER_TYPE = 90;
/** Downsample factor from 500 Hz → 250 Hz. */
const DS_FACTOR = 2;
/** Per-type cap on each question kind, to keep the bank varied. */
const KIND_CAP: Record<string, number> = {
  identify: 30,
  "which-finding": 22,
  rate: 22,
  axis: 14,
  territory: 20,
  lead: 12,
};
const SEED = 20260713;

// --- deterministic PRNG ------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseScp(raw: string): ScpMap {
  const map: ScpMap = {};
  const re = /'([^']+)'\s*:\s*([0-9.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) map[m[1]] = parseFloat(m[2]);
  return map;
}

interface CsvRow {
  ecg_id: string;
  scp_codes: string;
  filename_hr: string;
  report: string;
  infarction_stadium1: string;
  heart_axis: string;
}

function loadRows(): PtbRow[] {
  const text = fs.readFileSync(CSV_PATH, "utf8");
  const records = parse(text, { columns: true, skip_empty_lines: true }) as CsvRow[];
  return records.map((r) => ({
    ecgId: parseInt(r.ecg_id, 10),
    scp: parseScp(r.scp_codes),
    filenameHr: r.filename_hr,
    report: r.report ?? "",
    infarctionStadium1: r.infarction_stadium1 ?? "",
    heartAxis: r.heart_axis ?? "",
  }));
}

/** Downsample interleaved Int16 frames by `factor`. */
function downsample(rawDat: Buffer, nSig: number, nSamplesIn: number, factor: number) {
  const nOut = Math.floor(nSamplesIn / factor);
  const frameBytes = nSig * 2;
  const out = Buffer.alloc(nOut * frameBytes);
  for (let i = 0; i < nOut; i++) {
    const src = i * factor * frameBytes;
    rawDat.copy(out, i * frameBytes, src, src + frameBytes);
  }
  return { buf: out, nSamples: nOut };
}

async function main() {
  console.log("→ Loading ptbxl_database.csv …");
  const rows = loadRows();
  console.log(`  ${rows.length} records.`);

  // First-match disjoint buckets (array order = match priority).
  const buckets = new Map<string, PtbRow[]>(TYPES.map((t) => [t.id, []]));
  for (const row of rows) {
    for (const t of TYPES) {
      if (t.match(row)) {
        buckets.get(t.id)!.push(row);
        break;
      }
    }
  }

  console.log("→ Opening waveform zip (random access) …");
  if (!fs.existsSync(ZIP_PATH)) throw new Error(`PTB-XL zip not found at ${ZIP_PATH}`);
  const zip = await ZipReader.open(ZIP_PATH);
  const prisma = makePrisma();

  console.log("→ Resetting content tables …");
  await prisma.attempt.deleteMany();
  await prisma.questionState.deleteMany();
  await prisma.question.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.record.deleteMany();
  await prisma.typeProgress.deleteMany();
  await prisma.ecgType.deleteMany();

  let totalQuestions = 0;
  const kindTotals: Record<string, number> = {};

  for (const t of TYPES) {
    await prisma.ecgType.create({
      data: {
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        superclass: t.superclass,
        scpCodes: JSON.stringify(t.scpCodes),
        summary: t.summary,
        order: t.order,
        tier: typeTier(t),
        lesson: {
          create: {
            estMinutes: t.lesson.estMinutes,
            sections: JSON.stringify(t.lesson.sections),
            keyFacts: JSON.stringify(t.lesson.keyFacts),
          },
        },
      },
    });

    const candidates = shuffle(buckets.get(t.id)!).slice(0, RECORDS_PER_TYPE * 2);
    const kindCount: Record<string, number> = {};
    let recordsProcessed = 0;
    let made = 0;

    for (const row of candidates) {
      if (recordsProcessed >= RECORDS_PER_TYPE) break;
      const stem = ZIP_INNER_PREFIX + row.filenameHr;
      let decoded;
      try {
        decoded = await readRecord(zip, stem);
      } catch {
        continue;
      }
      recordsProcessed++;

      // Features from full-resolution signal; store the downsampled copy.
      const sig = decodeLeads(decoded.rawDat, decoded.leads, decoded.gain, decoded.fs, decoded.nSamples);
      const ds = downsample(decoded.rawDat, decoded.leads.length, decoded.nSamples, DS_FACTOR);

      const generated = generateForRecord(t, row, sig, rand);
      const keep: GenQuestion[] = [];
      for (const q of generated) {
        const cap = KIND_CAP[q.kind] ?? 15;
        if ((kindCount[q.kind] ?? 0) >= cap) continue;
        keep.push(q);
        kindCount[q.kind] = (kindCount[q.kind] ?? 0) + 1;
      }
      if (keep.length === 0) continue;

      const recordId = `ptbxl-${row.ecgId}`;
      await prisma.record.create({
        data: {
          id: recordId,
          source: "ptbxl",
          externalId: String(row.ecgId),
          fs: Math.round(decoded.fs / DS_FACTOR),
          nSamples: ds.nSamples,
          gain: decoded.gain,
          leads: JSON.stringify(decoded.leads),
          signalsB64: ds.buf.toString("base64"),
          ptbReport: row.report || null,
        },
      });

      for (const q of keep) {
        await prisma.question.create({
          data: {
            typeId: t.id,
            recordId,
            kind: q.kind,
            tier: q.tier,
            stem: q.stem,
            options: JSON.stringify(q.options),
            correctOptionId: q.correctOptionId,
            explanation: q.explanation,
            difficulty: TIER_RANK[q.tier],
            labels: JSON.stringify(q.labels),
            leadFocus: q.leadFocus,
          },
        });
        kindTotals[q.kind] = (kindTotals[q.kind] ?? 0) + 1;
        made++;
        totalQuestions++;
      }
    }
    console.log(`  ✓ ${t.id.padEnd(22)} ${made} questions from ${recordsProcessed} records`);
  }

  // ── Authored niche/expert types + waveform-free questions ────────────────
  let authoredCount = 0;
  for (const at of AUTHORED_TYPES) {
    await prisma.ecgType.create({
      data: {
        id: at.id,
        name: at.name,
        shortName: at.shortName,
        superclass: at.superclass,
        scpCodes: JSON.stringify([]),
        summary: at.summary,
        order: at.order,
        tier: at.tier,
        lesson: {
          create: {
            estMinutes: at.lesson.estMinutes,
            sections: JSON.stringify(at.lesson.sections),
            keyFacts: JSON.stringify(at.lesson.keyFacts),
          },
        },
      },
    });
  }
  for (const aq of AUTHORED_QUESTIONS) {
    const shuffled = shuffle(aq.options);
    const options = shuffled.map((label, i) => ({ id: String.fromCharCode(97 + i), label }));
    const correctOptionId = options.find((o) => o.label === aq.options[0])!.id;
    await prisma.question.create({
      data: {
        typeId: aq.typeId,
        recordId: null,
        kind: "criteria",
        tier: aq.tier,
        stem: aq.stem,
        options: JSON.stringify(options),
        correctOptionId,
        explanation: aq.explanation,
        difficulty: TIER_RANK[aq.tier],
        labels: JSON.stringify([]),
        topic: aq.typeId,
        authored: true,
        reviewStatus: "pending", // held out of the live bank until clinician sign-off
        leadFocus: null,
      },
    });
    authoredCount++;
    totalQuestions++;
  }
  console.log(`  ✓ authored: ${AUTHORED_TYPES.length} types, ${authoredCount} questions`);

  // ── Chapman-Shaoxing/Ningbo (CC-BY 4.0) — second source ──────────────────
  const CHAPMAN_DIR = path.join(PROJECT_ROOT, "data", "chapman-shaoxing");
  const selectedPath = path.join(CHAPMAN_DIR, "selected.json");
  const CHAPMAN_PER_TYPE = 20;
  if (fs.existsSync(selectedPath)) {
    interface Sel { rel: string; ecgId: string; snomed: string[]; scp: Record<string, number> }
    const selected: Sel[] = JSON.parse(fs.readFileSync(selectedPath, "utf8"));
    const chapPerType: Record<string, number> = {};
    let chapMade = 0;
    let chapRecords = 0;

    for (const sel of shuffle(selected)) {
      // Synthesize a taxonomy-compatible row (no axis / infarct-stage labels).
      const row: PtbRow = {
        ecgId: 0, scp: sel.scp, filenameHr: sel.rel, report: "",
        infarctionStadium1: "", heartAxis: "",
      };
      const t = TYPES.find((tp) => tp.match(row));
      if (!t) continue;
      if ((chapPerType[t.id] ?? 0) >= CHAPMAN_PER_TYPE) continue;

      const heaPath = path.join(CHAPMAN_DIR, `${sel.rel}.hea`);
      const matPath = path.join(CHAPMAN_DIR, `${sel.rel}.mat`);
      if (!fs.existsSync(heaPath) || !fs.existsSync(matPath)) continue;
      let h;
      try { h = parseHeader(fs.readFileSync(heaPath, "utf8")); } catch { continue; }
      if (h.nSig !== 12) continue;
      let mat;
      try { mat = readMat(matPath, h.nSig, h.nSamples); } catch { continue; }

      const gain = h.gains[0];
      const sig = decodeLeads(mat.rawDat, h.leads, gain, h.fs, h.nSamples);
      const ds = downsample(mat.rawDat, h.nSig, h.nSamples, DS_FACTOR);

      // Drop axis questions for Chapman (no heart-axis label to cross-check).
      const generated = generateForRecord(t, row, sig, rand).filter((q) => q.kind !== "axis");
      if (generated.length === 0) continue;

      chapPerType[t.id] = (chapPerType[t.id] ?? 0) + 1;
      chapRecords++;
      const recordId = `chapman-${sel.ecgId}`;
      await prisma.record.create({
        data: {
          id: recordId,
          source: "chapman",
          externalId: sel.ecgId,
          fs: Math.round(h.fs / DS_FACTOR),
          nSamples: ds.nSamples,
          gain,
          leads: JSON.stringify(h.leads),
          signalsB64: ds.buf.toString("base64"),
          ptbReport: null,
        },
      });
      for (const q of generated) {
        await prisma.question.create({
          data: {
            typeId: t.id, recordId, kind: q.kind, tier: q.tier, stem: q.stem,
            options: JSON.stringify(q.options), correctOptionId: q.correctOptionId,
            explanation: q.explanation, difficulty: TIER_RANK[q.tier],
            labels: JSON.stringify(q.labels), leadFocus: q.leadFocus,
          },
        });
        kindTotals[q.kind] = (kindTotals[q.kind] ?? 0) + 1;
        chapMade++;
        totalQuestions++;
      }
    }
    console.log(`  ✓ chapman: ${chapRecords} records, ${chapMade} questions`);
  } else {
    console.log("  (chapman subset not staged — skipping second source)");
  }

  await prisma.user.upsert({ where: { id: "local" }, update: {}, create: { id: "local" } });

  zip.close();
  await prisma.$disconnect();

  console.log("\n  by kind: " + Object.entries(kindTotals).map(([k, v]) => `${k}=${v}`).join("  "));
  console.log(
    `✔ Ingest complete: ${TYPES.length + AUTHORED_TYPES.length} types ` +
      `(${TYPES.length} data-backed + ${AUTHORED_TYPES.length} authored), ${totalQuestions} questions.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
