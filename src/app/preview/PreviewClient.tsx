"use client";

import { useState } from "react";
import EcgViewer from "@/components/EcgViewer";

export interface PreviewRecord {
  typeId: string;
  typeName: string;
  shortName: string;
  recordId: string;
  ecgId: number;
  signalsB64: string;
  leadOrder: string[];
  gain: number;
  fs: number;
  nSamples: number;
  leadFocus: string | null;
}

export default function PreviewClient({ records }: { records: PreviewRecord[] }) {
  const [idx, setIdx] = useState(0);
  const rec = records[idx];
  if (!rec) return <p className="text-sm text-slate-500">No records seeded.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {records.map((r, i) => (
          <button
            key={r.recordId}
            type="button"
            onClick={() => setIdx(i)}
            className={
              "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
              (i === idx
                ? "bg-clinical-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")
            }
          >
            {r.shortName}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {rec.typeName}
        </h2>
        <p className="text-xs text-slate-400">
          PTB-XL record #{rec.ecgId} · {rec.fs} Hz · {rec.leadOrder.length} leads
        </p>
      </div>

      <EcgViewer
        key={rec.recordId}
        signalsB64={rec.signalsB64}
        leadOrder={rec.leadOrder}
        gain={rec.gain}
        fs={rec.fs}
        nSamples={rec.nSamples}
        defaultHighlight={rec.leadFocus}
        caption={`Rendered from raw PTB-XL signal (record #${rec.ecgId}).`}
      />
    </div>
  );
}
