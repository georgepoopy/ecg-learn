/**
 * Download a BOUNDED, deterministic subset of the Chapman-Shaoxing/Ningbo
 * dataset (PhysioNet "ecg-arrhythmia" v1.0.0, CC-BY 4.0) directly from PhysioNet
 * into data/chapman-shaoxing/. We only keep records whose SNOMED Dx maps to our
 * taxonomy (see chapman-map.ts), capped per condition for balance.
 *
 * This is NOT web scraping of ECG content — it is a direct, license-checked
 * download of raw signal files from the dataset's official host.
 *
 * Run: npx tsx scripts/fetch/chapman.ts
 */
import fs from "node:fs";
import path from "node:path";
import { snomedToScp } from "../ingest/chapman-map";

const BASE = "https://physionet.org/files/ecg-arrhythmia/1.0.0";
const OUT = path.resolve(__dirname, "..", "..", "data", "chapman-shaoxing");
const RECORDS_DIR = path.join(OUT, "WFDBRecords");

const SCAN_BUDGET = 3200; // max headers to inspect
const TOTAL_CAP = 460; // max records to download
const PER_KEY_CAP = 24; // max per primary condition (balance)
const CONCURRENCY = 10;
const SEED = 20260714;

// Priority for choosing a record's "primary" condition (specific first).
const PRIORITY = [
  "3AVB", "2AVB", "WPW", "LNGQT", "AFLT", "CLBBB", "CRBBB", "RVH", "LVH",
  "AFIB", "1AVB", "PVC", "PAC", "SBRAD", "STACH", "SARRH", "STD_", "INVT", "NT_",
  "SR",
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
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

async function pmap<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

async function fetchBuf(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

function parseDx(hea: string): string[] {
  const m = hea.match(/#Dx:\s*([0-9,]+)/);
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

interface Selected {
  rel: string; // e.g. WFDBRecords/01/010/JS00001
  ecgId: string; // JS00001
  snomed: string[];
  scp: Record<string, number>;
}

async function main() {
  const recordsFile = path.join(OUT, "RECORDS");
  if (!fs.existsSync(recordsFile)) throw new Error(`Missing ${recordsFile} — run the metadata download first.`);
  const subdirs = shuffle(
    fs.readFileSync(recordsFile, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
  );

  const keyCount: Record<string, number> = {};
  const selected: Selected[] = [];
  let scanned = 0;

  for (const sub of subdirs) {
    if (scanned >= SCAN_BUDGET || selected.length >= TOTAL_CAP) break;
    const dirUrl = `${BASE}/${sub}`;
    const html = await fetchText(dirUrl);
    if (!html) continue;
    const names = Array.from(new Set([...html.matchAll(/href="(JS\d+)\.hea"/g)].map((m) => m[1])));
    if (names.length === 0) continue;

    // Inspect headers concurrently.
    const heas = await pmap(names, CONCURRENCY, async (name) => {
      const hea = await fetchText(`${dirUrl}${name}.hea`);
      return { name, hea };
    });
    scanned += heas.length;

    const toDownload: Selected[] = [];
    for (const { name, hea } of heas) {
      if (!hea) continue;
      const snomed = parseDx(hea);
      const scp = snomedToScp(snomed);
      if (!scp) continue;
      const key = PRIORITY.find((k) => k in scp) ?? "SR";
      if ((keyCount[key] ?? 0) >= PER_KEY_CAP) continue;
      if (selected.length + toDownload.length >= TOTAL_CAP) break;
      keyCount[key] = (keyCount[key] ?? 0) + 1;
      toDownload.push({ rel: `${sub}${name}`, ecgId: name, snomed, scp });
    }

    // Download selected .hea + .mat.
    await pmap(toDownload, CONCURRENCY, async (sel) => {
      const outDir = path.join(OUT, path.dirname(sel.rel));
      fs.mkdirSync(outDir, { recursive: true });
      const heaBuf = await fetchBuf(`${BASE}/${sel.rel}.hea`);
      const matBuf = await fetchBuf(`${BASE}/${sel.rel}.mat`);
      if (heaBuf && matBuf) {
        fs.writeFileSync(path.join(OUT, `${sel.rel}.hea`), heaBuf);
        fs.writeFileSync(path.join(OUT, `${sel.rel}.mat`), matBuf);
        selected.push(sel);
      }
    });

    console.log(`  scanned=${scanned} selected=${selected.length} (last dir ${sub})`);
  }

  fs.writeFileSync(path.join(OUT, "selected.json"), JSON.stringify(selected, null, 0));
  const byKey: Record<string, number> = {};
  for (const s of selected) {
    const key = PRIORITY.find((k) => k in s.scp) ?? "SR";
    byKey[key] = (byKey[key] ?? 0) + 1;
  }
  console.log("\nby primary condition: " + Object.entries(byKey).map(([k, v]) => `${k}=${v}`).join("  "));
  console.log(`✔ Downloaded ${selected.length} records (scanned ${scanned}) → ${RECORDS_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
