/**
 * Derive quantitative features (ventricular rate, QRS axis) from a decoded
 * waveform. These power the "measure the rate" / "determine the axis" question
 * types. Every derived answer is later cross-checked against PTB-XL's own labels
 * before a question is emitted, so a noisy measurement never becomes a question.
 */

export interface LeadSignals {
  fs: number;
  nSamples: number;
  leads: Record<string, Float32Array>; // normalised lead name -> mV
}

function normalizeLead(name: string): string {
  const u = name.toUpperCase();
  if (u === "AVR") return "aVR";
  if (u === "AVL") return "aVL";
  if (u === "AVF") return "aVF";
  return u;
}

/** Decode raw interleaved Int16 (.dat) into per-lead mV arrays. */
export function decodeLeads(
  rawDat: Buffer,
  leadOrder: string[],
  gain: number,
  fs: number,
  nSamples: number,
): LeadSignals {
  const nSig = leadOrder.length;
  const names = leadOrder.map(normalizeLead);
  const leads: Record<string, Float32Array> = {};
  for (const n of names) leads[n] = new Float32Array(nSamples);
  for (let i = 0; i < nSamples; i++) {
    const base = i * nSig;
    for (let s = 0; s < nSig; s++) {
      leads[names[s]][i] = rawDat.readInt16LE((base + s) * 2) / gain;
    }
  }
  return { fs, nSamples, leads };
}

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const a = xs.slice().sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Baseline-correct a lead by subtracting its median (isoelectric estimate). */
function baseline(sig: Float32Array): Float32Array {
  const med = median(Array.from(sig));
  const out = new Float32Array(sig.length);
  for (let i = 0; i < sig.length; i++) out[i] = sig[i] - med;
  return out;
}

export interface RPeaks {
  peaks: number[]; // sample indices
  rrMs: number[]; // successive R–R intervals in ms
}

/**
 * Simple R-peak detector: threshold on the rectified, baseline-corrected lead
 * with a refractory period. Good enough for rate estimation on clean 10 s
 * strips; low-confidence results are filtered out downstream.
 */
export function detectRPeaks(sig: Float32Array, fs: number): RPeaks {
  const b = baseline(sig);
  // Robust amplitude scale: 60th percentile of |signal| high end.
  let maxAbs = 0;
  for (let i = 0; i < b.length; i++) maxAbs = Math.max(maxAbs, Math.abs(b[i]));
  const thresh = 0.4 * maxAbs;
  const refractory = Math.round(0.28 * fs); // ~213 bpm ceiling

  const peaks: number[] = [];
  let last = -refractory;
  for (let i = 1; i < b.length - 1; i++) {
    const v = Math.abs(b[i]);
    if (v >= thresh && b[i] >= b[i - 1] && b[i] > b[i + 1] && i - last >= refractory) {
      // local refine: pick the max within a small window
      let bi = i;
      const w = Math.round(0.05 * fs);
      for (let j = Math.max(0, i - w); j <= Math.min(b.length - 1, i + w); j++) {
        if (Math.abs(b[j]) > Math.abs(b[bi])) bi = j;
      }
      peaks.push(bi);
      last = bi;
    }
  }
  const rrMs: number[] = [];
  for (let i = 1; i < peaks.length; i++) rrMs.push(((peaks[i] - peaks[i - 1]) / fs) * 1000);
  return { peaks, rrMs };
}

export interface RateResult {
  bpm: number;
  regular: boolean;
  nBeats: number;
  confident: boolean;
}

/** Estimate ventricular rate from lead II (fallback: the widest-amplitude lead). */
export function estimateRate(sig: LeadSignals): RateResult {
  const lead = sig.leads["II"] ?? sig.leads["I"] ?? Object.values(sig.leads)[0];
  const { rrMs } = detectRPeaks(lead, sig.fs);
  if (rrMs.length < 5) return { bpm: NaN, regular: false, nBeats: rrMs.length + 1, confident: false };
  const medRr = median(rrMs);
  const bpm = 60000 / medRr;
  // Regularity: coefficient of variation of R–R.
  const mean = rrMs.reduce((a, b) => a + b, 0) / rrMs.length;
  const sd = Math.sqrt(rrMs.reduce((a, b) => a + (b - mean) ** 2, 0) / rrMs.length);
  const cv = sd / mean;
  const regular = cv < 0.12;
  const confident = rrMs.length >= 6 && bpm >= 30 && bpm <= 200 && cv < 0.2;
  return { bpm, regular, nBeats: rrMs.length + 1, confident };
}

export type Axis = "normal" | "left" | "right" | "extreme";

export interface AxisResult {
  axis: Axis;
  netI: number;
  netAVF: number;
  confident: boolean;
}

/** Mean net QRS deflection in a window around each R peak (baseline-corrected). */
function netQrs(sig: Float32Array, peaks: number[], fs: number): number {
  if (peaks.length === 0) return 0;
  const b = baseline(sig);
  const half = Math.round(0.05 * fs); // ±50 ms QRS window
  let total = 0;
  let n = 0;
  for (const p of peaks) {
    let s = 0;
    for (let j = Math.max(0, p - half); j <= Math.min(b.length - 1, p + half); j++) s += b[j];
    total += s;
    n++;
  }
  return n ? total / n : 0;
}

/** Estimate frontal-plane QRS axis quadrant from leads I and aVF. */
export function estimateAxis(sig: LeadSignals): AxisResult {
  const leadII = sig.leads["II"] ?? sig.leads["I"];
  const { peaks } = detectRPeaks(leadII, sig.fs);
  const I = sig.leads["I"];
  const aVF = sig.leads["aVF"];
  if (!I || !aVF || peaks.length < 5) {
    return { axis: "normal", netI: 0, netAVF: 0, confident: false };
  }
  const netI = netQrs(I, peaks, sig.fs);
  const netAVF = netQrs(aVF, peaks, sig.fs);
  let axis: Axis;
  if (netI >= 0 && netAVF >= 0) axis = "normal";
  else if (netI >= 0 && netAVF < 0) axis = "left";
  else if (netI < 0 && netAVF >= 0) axis = "right";
  else axis = "extreme";
  // Confident only when deflections are clearly off zero.
  const scale = Math.max(Math.abs(netI), Math.abs(netAVF));
  const confident = scale > 0.05 && Math.abs(netI) > 0.02 && Math.abs(netAVF) > 0.02;
  return { axis, netI, netAVF, confident };
}

/** Map PTB-XL heart_axis strings to our quadrant, for cross-checking. */
export function axisFromLabel(heartAxis: string): Axis | null {
  switch (heartAxis) {
    case "MID":
    case "NORM":
      return "normal";
    case "LAD":
    case "ALAD":
      return "left";
    case "RAD":
    case "ARAD":
      return "right";
    default:
      return null; // AXL/AXR/blank → unknown
  }
}
