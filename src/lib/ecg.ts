/**
 * Shared ECG signal + layout helpers used by the canvas renderer.
 *
 * Signals are stored (see ingestion) as base64 of the raw interleaved Int16
 * PTB-XL samples. Physical value in mV = raw / gain (baseline 0). Decoding here
 * is deliberately dependency-free so it runs in the browser.
 */

export interface EcgSignal {
  fs: number;
  nSamples: number;
  /** Lead name (normalised) -> Float32 samples in mV. */
  leads: Record<string, Float32Array>;
  /** Lead names in their original signal order. */
  order: string[];
}

/** Normalise PTB-XL lead casing (AVR -> aVR) for display + lookup. */
export function normalizeLead(name: string): string {
  const u = name.toUpperCase();
  if (u === "AVR") return "aVR";
  if (u === "AVL") return "aVL";
  if (u === "AVF") return "aVF";
  return u; // I, II, III, V1..V6
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node fallback (used in tests / server).
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/** Decode stored base64 Int16 signal into per-lead mV arrays. */
export function decodeSignals(
  b64: string,
  leadOrder: string[],
  gain: number,
  fs: number,
  nSamples: number,
): EcgSignal {
  const bytes = base64ToBytes(b64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nSig = leadOrder.length;
  const order = leadOrder.map(normalizeLead);
  const leads: Record<string, Float32Array> = {};
  for (const name of order) leads[name] = new Float32Array(nSamples);

  for (let i = 0; i < nSamples; i++) {
    const base = i * nSig;
    for (let s = 0; s < nSig; s++) {
      const raw = view.getInt16((base + s) * 2, true); // little-endian
      leads[order[s]][i] = raw / gain;
    }
  }
  return { fs, nSamples, leads, order };
}

// --- Standard 12-lead clinical layout ---------------------------------------

/** Classic 3×4 grid: each cell shows one lead during its 2.5 s time window. */
export const LAYOUT_3x4: string[][] = [
  ["I", "aVR", "V1", "V4"],
  ["II", "aVL", "V2", "V5"],
  ["III", "aVF", "V3", "V6"],
];

/** Lead used for the continuous 10 s rhythm strip beneath the 3×4 grid. */
export const RHYTHM_LEAD = "II";

/** All 12 leads in canonical order (for the stacked layout / validation). */
export const LEADS_12 = [
  "I", "II", "III", "aVR", "aVL", "aVF",
  "V1", "V2", "V3", "V4", "V5", "V6",
];

// --- Calibration presets -----------------------------------------------------

/** Paper speeds (mm/s). 25 is standard; 50 spreads complexes out. */
export const SPEEDS = [25, 50] as const;
/** Gains (mm/mV). 10 is standard; 5 halves, 20 doubles amplitude. */
export const GAINS = [5, 10, 20] as const;

export type Speed = (typeof SPEEDS)[number];
export type Gain = (typeof GAINS)[number];
