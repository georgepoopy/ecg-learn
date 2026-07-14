/** Human-readable dataset labels + attribution, keyed by Record.source. */

export const DATASET_LABEL: Record<string, string> = {
  ptbxl: "PTB-XL",
  chapman: "Chapman-Shaoxing/Ningbo",
};

export function sourceLabel(source: string): string {
  return DATASET_LABEL[source] ?? source;
}
