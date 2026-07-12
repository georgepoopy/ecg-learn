/**
 * PTB-XL ingestion pipeline.
 *
 *   1. Parse ptbxl_database.csv (+ scp_statements.csv, already encoded in the
 *      curated taxonomy).
 *   2. Assign each record to a curated ECG type when its labels match cleanly.
 *   3. Take a balanced, deterministic sample per type.
 *   4. Read each sampled record's 12-lead signal from the source zip and store
 *      it (raw Int16 base64 + gain/leads) — a faithful copy of the waveform.
 *   5. Author an identification question per record, distractors drawn from
 *      sibling type labels.
 *   6. Seed SQLite via Prisma.
 *
 * Run: `npm run ingest`
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { ZipReader, readRecord } from "./wfdb";
import {
  TYPES,
  TYPES_BY_ID,
  MI_TERRITORY,
  MI_CODES,
  type PtbRow,
  type ScpMap,
} from "./taxonomy";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data", "ptb-xl");
const CSV_PATH = path.join(DATA_DIR, "ptbxl_database.csv");

// The full waveform archive lives in the source zip alongside the project.
const ZIP_PATH = path.resolve(
  PROJECT_ROOT,
  "..",
  "Claude",
  "ptb-xl-a-large-publicly-available-electrocardiography-dataset-1.0.3.zip",
);
const ZIP_INNER_PREFIX =
  "ptb-xl-a-large-publicly-available-electrocardiography-dataset-1.0.3/";

/** How many records (→ questions) to build per type in this pass. */
const PER_TYPE = 24;
/** Deterministic seed so the bank is stable across runs. */
const SEED = 20260712;

// --- tiny deterministic PRNG (mulberry32) -----------------------------------
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

/** Parse the Python-dict-ish scp_codes string into a { code: likelihood } map. */
function parseScp(raw: string): ScpMap {
  const map: ScpMap = {};
  const re = /'([^']+)'\s*:\s*([0-9.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    map[m[1]] = parseFloat(m[2]);
  }
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

/** Build an explanation string for a record, factual and type-specific. */
function buildExplanation(typeId: string, row: PtbRow): string {
  const t = TYPES_BY_ID[typeId];
  const facts = t.lesson.keyFacts.join("; ");
  if (typeId === "stemi") {
    const loc = MI_CODES.filter((c) => c in row.scp)
      .map((c) => MI_TERRITORY[c])
      .filter(Boolean);
    const where = loc.length ? ` The labelled territory here is ${loc.join("/")}.` : "";
    return (
      `This tracing carries an acute-stage infarction pattern (${t.name}).${where} ` +
      `Look for: ${facts}.`
    );
  }
  return `This is ${t.name}. Look for: ${facts}.`;
}

/** Assemble 4 MCQ options (correct + 3 sibling labels), return options+correctId. */
function buildOptions(typeId: string) {
  const t = TYPES_BY_ID[typeId];
  const distractors = t.confusableWith
    .map((id) => TYPES_BY_ID[id])
    .filter(Boolean)
    .slice(0, 3)
    .map((d) => d.answerLabel);
  const labels = shuffle([t.answerLabel, ...distractors]);
  const options = labels.map((label, i) => ({ id: String.fromCharCode(97 + i), label }));
  const correctOptionId = options.find((o) => o.label === t.answerLabel)!.id;
  return { options, correctOptionId };
}

async function main() {
  console.log("→ Loading ptbxl_database.csv …");
  const rows = loadRows();
  console.log(`  ${rows.length} records.`);

  // Assign records to types. A record can match multiple predicates; assign to
  // the first (lowest-order) matching type to keep examples clean and disjoint.
  const buckets = new Map<string, PtbRow[]>(TYPES.map((t) => [t.id, []]));
  for (const row of rows) {
    for (const t of TYPES) {
      if (t.match(row)) {
        buckets.get(t.id)!.push(row);
        break;
      }
    }
  }
  for (const t of TYPES) {
    console.log(`  ${t.id}: ${buckets.get(t.id)!.length} candidate records`);
  }

  console.log(`→ Opening waveform zip (random access) …`);
  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(`PTB-XL zip not found at ${ZIP_PATH}`);
  }
  const zip = await ZipReader.open(ZIP_PATH);

  const prisma = new PrismaClient();

  console.log("→ Resetting content tables …");
  await prisma.attempt.deleteMany();
  await prisma.questionState.deleteMany();
  await prisma.question.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.record.deleteMany();
  await prisma.typeProgress.deleteMany();
  await prisma.ecgType.deleteMany();

  let totalQuestions = 0;

  for (const t of TYPES) {
    // Insert the type + lesson.
    await prisma.ecgType.create({
      data: {
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        superclass: t.superclass,
        scpCodes: JSON.stringify(t.scpCodes),
        summary: t.summary,
        order: t.order,
        lesson: {
          create: {
            estMinutes: t.lesson.estMinutes,
            sections: JSON.stringify(t.lesson.sections),
            keyFacts: JSON.stringify(t.lesson.keyFacts),
          },
        },
      },
    });

    const candidates = shuffle(buckets.get(t.id)!);
    let made = 0;

    for (const row of candidates) {
      if (made >= PER_TYPE) break;
      const stem = ZIP_INNER_PREFIX + row.filenameHr; // e.g. .../00001_hr
      let decoded;
      try {
        decoded = await readRecord(zip, stem);
      } catch (err) {
        console.warn(`  ! skip ${row.ecgId}: ${(err as Error).message}`);
        continue;
      }

      const recordId = `ptbxl-${row.ecgId}`;
      await prisma.record.create({
        data: {
          id: recordId,
          ecgId: row.ecgId,
          fs: decoded.fs,
          nSamples: decoded.nSamples,
          gain: decoded.gain,
          leads: JSON.stringify(decoded.leads),
          signalsB64: decoded.rawDat.toString("base64"),
          ptbReport: row.report || null,
        },
      });

      const { options, correctOptionId } = buildOptions(t.id);
      await prisma.question.create({
        data: {
          typeId: t.id,
          recordId,
          stem: "Identify the rhythm or diagnosis shown in this 12-lead ECG.",
          options: JSON.stringify(options),
          correctOptionId,
          explanation: buildExplanation(t.id, row),
          difficulty: 1,
          leadFocus: t.leadFocus ?? null,
        },
      });

      made++;
      totalQuestions++;
    }
    console.log(`  ✓ ${t.id}: ${made} questions`);
  }

  // Ensure a single local user exists.
  await prisma.user.upsert({ where: { id: "local" }, update: {}, create: { id: "local" } });

  zip.close();
  await prisma.$disconnect();
  console.log(`\n✔ Ingest complete: ${TYPES.length} types, ${totalQuestions} questions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
