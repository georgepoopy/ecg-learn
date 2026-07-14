/**
 * Reader for the CinC/Chapman `.mat` signal files.
 *
 * These are MATLAB Level-4 MAT-files: a 20-byte header (5×int32:
 * type, mrows, ncols, imagf, namelen), then the null-terminated variable name
 * ("val" → 4 bytes), then the sample data. The WFDB `.hea` describes the signal
 * as format `16+24` — i.e. 16-bit little-endian samples beginning at byte offset
 * 24 (= 20 + 4), interleaved across the 12 leads. For a 12×5000 `val` matrix the
 * column-major MATLAB layout linearises to exactly that sample-interleaved order,
 * identical to PTB-XL's `.dat`, so we return the raw int16 buffer directly.
 */
import fs from "node:fs";

export interface MatSignal {
  /** Sample-interleaved int16 LE, ready for decodeLeads (like PTB-XL .dat). */
  rawDat: Buffer;
}

export function readMat(filePath: string, nSig: number, nSamples: number): MatSignal {
  const buf = fs.readFileSync(filePath);
  // MATLAB v4 header: type, mrows, ncols, imagf, namelen (all int32 LE).
  const namelen = buf.readInt32LE(16);
  const dataOffset = 20 + namelen; // 24 for the "val" variable
  const need = nSig * nSamples * 2;
  const rawDat = buf.subarray(dataOffset, dataOffset + need);
  if (rawDat.length !== need) {
    throw new Error(`mat ${filePath}: got ${rawDat.length} data bytes, expected ${need}`);
  }
  return { rawDat };
}
