/**
 * Minimal WFDB reader for PTB-XL `records500`.
 *
 * PTB-XL waveforms are 12-lead, 500 Hz, 5000 samples (10 s), format-16
 * (16-bit signed little-endian, sample-major interleaved across leads),
 * gain 1000 ADU/mV, baseline 0. We read the specific `.hea`/`.dat` entries we
 * need directly from the source PhysioNet zip via random access (yauzl), so the
 * 1.7 GB archive never needs to be unpacked or held in memory.
 */
import yauzl from "yauzl";

/** Random-access reader over a (large) zip; indexes the central directory once. */
export class ZipReader {
  private constructor(
    private zip: yauzl.ZipFile,
    private entries: Map<string, yauzl.Entry>,
  ) {}

  static open(path: string): Promise<ZipReader> {
    return new Promise((resolve, reject) => {
      yauzl.open(path, { lazyEntries: true, autoClose: false }, (err, zip) => {
        if (err || !zip) return reject(err ?? new Error("failed to open zip"));
        const entries = new Map<string, yauzl.Entry>();
        zip.on("entry", (e) => {
          entries.set(e.fileName, e);
          zip.readEntry();
        });
        zip.on("end", () => resolve(new ZipReader(zip, entries)));
        zip.on("error", reject);
        zip.readEntry();
      });
    });
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  readEntry(name: string): Promise<Buffer> {
    const entry = this.entries.get(name);
    if (!entry) return Promise.reject(new Error(`Zip entry not found: ${name}`));
    return new Promise((resolve, reject) => {
      this.zip.openReadStream(entry, (err, stream) => {
        if (err || !stream) return reject(err ?? new Error("no read stream"));
        const chunks: Buffer[] = [];
        stream.on("data", (c: Buffer) => chunks.push(c));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });
    });
  }

  close(): void {
    this.zip.close();
  }
}

export interface WfdbHeader {
  recName: string;
  nSig: number;
  fs: number;
  nSamples: number;
  leads: string[];
  gains: number[];
  baselines: number[];
  formats: number[];
}

/** Parse a WFDB `.hea` header (single-segment, one signal file). */
export function parseHeader(text: string): WfdbHeader {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  const rec = lines[0].split(/\s+/);
  const recName = rec[0];
  const nSig = parseInt(rec[1], 10);
  const fs = parseFloat(rec[2]);
  const nSamples = parseInt(rec[3], 10);

  const leads: string[] = [];
  const gains: number[] = [];
  const baselines: number[] = [];
  const formats: number[] = [];

  for (let i = 1; i <= nSig; i++) {
    const p = lines[i].split(/\s+/);
    // p[1] = format, p[2] = "gain(baseline)/units", last token = lead name
    formats.push(parseInt(p[1], 10));
    const gf = p[2] ?? "200";
    const m = gf.match(/^([0-9.]+)(?:\((-?\d+)\))?/);
    gains.push(m ? parseFloat(m[1]) : 200);
    baselines.push(m && m[2] !== undefined ? parseInt(m[2], 10) : 0);
    leads.push(p[p.length - 1]);
  }

  return { recName, nSig, fs, nSamples, leads, gains, baselines, formats };
}

export interface DecodedRecord {
  fs: number;
  nSamples: number;
  nSig: number;
  leads: string[];
  gain: number; // uniform ADU/mV (asserted)
  baseline: number; // uniform (asserted 0 for PTB-XL)
  /** Raw interleaved Int16 LE samples, exactly as stored in the .dat. */
  rawDat: Buffer;
}

/**
 * Read + decode one PTB-XL record given its zip-internal path stem, e.g.
 * "ptb-xl-.../records500/00000/00001_hr" (without extension).
 * Verifies format-16 and uniform gain/baseline (throws otherwise) so the
 * compact single-gain storage stays faithful.
 */
export async function readRecord(zip: ZipReader, entryStem: string): Promise<DecodedRecord> {
  const headerText = (await zip.readEntry(`${entryStem}.hea`)).toString("utf8");
  const h = parseHeader(headerText);

  if (!h.formats.every((f) => f === 16)) {
    throw new Error(`${entryStem}: expected all format-16 signals, got ${h.formats.join(",")}`);
  }
  const gain = h.gains[0];
  const baseline = h.baselines[0];
  if (!h.gains.every((g) => g === gain)) {
    throw new Error(`${entryStem}: non-uniform gain ${h.gains.join(",")}`);
  }
  if (!h.baselines.every((b) => b === baseline)) {
    throw new Error(`${entryStem}: non-uniform baseline ${h.baselines.join(",")}`);
  }

  const rawDat = await zip.readEntry(`${entryStem}.dat`);
  const expected = h.nSig * h.nSamples * 2;
  if (rawDat.length !== expected) {
    throw new Error(`${entryStem}: .dat length ${rawDat.length} != expected ${expected}`);
  }

  return {
    fs: h.fs,
    nSamples: h.nSamples,
    nSig: h.nSig,
    leads: h.leads,
    gain,
    baseline,
    rawDat,
  };
}
