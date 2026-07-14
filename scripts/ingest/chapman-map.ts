/**
 * SNOMED-CT → our SCP-style code mapping for the Chapman-Shaoxing/Ningbo dataset.
 *
 * Only HIGH-CONFIDENCE mappings are included. Codes we deliberately DO NOT map
 * (and why) are listed in `SNOMED_SKIP` and documented in DATA_SOURCES.md /
 * REVIEW.md — e.g. generic "myocardial infarction" carries no acuity, so it must
 * not become an acute-STEMI question.
 */

export const SNOMED_TO_SCP: Record<string, string> = {
  // Sinus / rate
  "426783006": "SR", // Sinus rhythm
  "426177001": "SBRAD", // Sinus bradycardia
  "427084000": "STACH", // Sinus tachycardia
  "427393009": "SARRH", // Sinus irregularity → sinus arrhythmia
  // Atrial rhythms
  "164889003": "AFIB", // Atrial fibrillation
  "164890007": "AFLT", // Atrial flutter
  // AV blocks
  "270492004": "1AVB",
  "195042002": "2AVB",
  "54016002": "2AVB", // Mobitz I
  "28189009": "2AVB", // Mobitz II
  "27885002": "3AVB",
  // Bundle branch blocks (all left variants share one SNOMED code here)
  "59118001": "CRBBB", // RBBB
  "164909002": "CLBBB", // LBBB / LBBBB / LFBBB
  // Hypertrophy
  "164873001": "LVH",
  "89792004": "RVH",
  // Pre-excitation
  "74390002": "WPW",
  "195060002": "WPW", // ventricular pre-excitation
  // Repolarisation
  "111975006": "LNGQT", // QT interval extension
  "429622005": "STD_", // ST drop-down → ST depression
  "428750005": "STD_", // generic ST-T change → treat as ST-T
  "164934002": "NT_", // T wave change
  "59931005": "INVT", // T wave opposite → inversion
  // Ectopy
  "284470004": "PAC", // atrial premature beats
  "17338001": "PVC", // ventricular premature beat
};

/** Codes we recognise but intentionally do not map (reason → REVIEW.md). */
export const SNOMED_SKIP: Record<string, string> = {
  "164865005": "generic MI — no acuity encoded; would mislabel acute STEMI",
  "233896004": "AVNRT — no teachable type yet",
  "233897008": "AVRT — no teachable type yet",
  "426995002": "junctional escape beat — no teachable type yet",
  "195101003": "wandering pacemaker — no teachable type yet",
  "164937009": "U wave — no teachable type yet",
};

/** Abnormal SCP codes (used to decide whether a Chapman 'SR' record is clean-normal). */
const ABNORMAL = new Set([
  "SBRAD", "STACH", "SARRH", "AFIB", "AFLT", "1AVB", "2AVB", "3AVB",
  "CRBBB", "CLBBB", "LVH", "RVH", "WPW", "LNGQT", "STD_", "NT_", "INVT", "PAC", "PVC",
]);

/**
 * Map a record's SNOMED Dx list into a synthesized scp map compatible with the
 * existing PTB-XL taxonomy. Returns null if nothing maps (record is skipped).
 */
export function snomedToScp(snomedCodes: string[]): Record<string, number> | null {
  const scp: Record<string, number> = {};
  for (const code of snomedCodes) {
    const mapped = SNOMED_TO_SCP[code];
    if (mapped) scp[mapped] = 100;
  }
  if (Object.keys(scp).length === 0) return null;

  // A Chapman 'SR' record with no abnormal mapped finding is a clean normal
  // sinus example → add NORM so it buckets to the normal-sinus type (PTB-XL
  // marks these with NORM; Chapman does not).
  const hasAbnormal = Object.keys(scp).some((c) => ABNORMAL.has(c));
  if (scp["SR"] && !hasAbnormal) scp["NORM"] = 100;

  return scp;
}
