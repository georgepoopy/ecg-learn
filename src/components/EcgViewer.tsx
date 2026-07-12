"use client";

import { useState } from "react";
import EcgCanvas from "./EcgCanvas";
import { SPEEDS, GAINS, type Speed, type Gain } from "@/lib/ecg";

export interface EcgViewerProps {
  signalsB64: string;
  leadOrder: string[];
  gain: number;
  fs: number;
  nSamples: number;
  defaultHighlight?: string | null;
  caption?: string;
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  format,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            onClick={() => onChange(o)}
            className={
              "px-2.5 py-1 text-xs transition-colors " +
              (o === value
                ? "bg-clinical-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800")
            }
          >
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EcgViewer({
  signalsB64,
  leadOrder,
  gain,
  fs,
  nSamples,
  defaultHighlight = null,
  caption,
}: EcgViewerProps) {
  const [speed, setSpeed] = useState<Speed>(25);
  const [ampGain, setAmpGain] = useState<Gain>(10);
  const [layout, setLayout] = useState<"3x4" | "stack">("3x4");
  const [highlight, setHighlight] = useState<boolean>(Boolean(defaultHighlight));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Segmented
          label="Speed"
          value={speed}
          options={SPEEDS}
          onChange={setSpeed}
          format={(v) => `${v} mm/s`}
        />
        <Segmented
          label="Gain"
          value={ampGain}
          options={GAINS}
          onChange={setAmpGain}
          format={(v) => `${v} mm/mV`}
        />
        <Segmented
          label="Layout"
          value={layout}
          options={["3x4", "stack"] as const}
          onChange={setLayout}
          format={(v) => (v === "3x4" ? "3×4 + strip" : "Stacked")}
        />
        {defaultHighlight && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={highlight}
              onChange={(e) => setHighlight(e.target.checked)}
              className="accent-clinical-600"
            />
            Spotlight lead {defaultHighlight}
          </label>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white p-2 dark:bg-slate-950">
        <EcgCanvas
          signalsB64={signalsB64}
          leadOrder={leadOrder}
          gain={gain}
          fs={fs}
          nSamples={nSamples}
          speed={speed}
          ampGain={ampGain}
          layout={layout}
          highlightLead={highlight ? defaultHighlight : null}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>{caption}</span>
        <span>
          Calibration: {speed} mm/s, {ampGain} mm/mV · 1 mV = {ampGain} mm (pulse at left)
        </span>
      </div>
    </div>
  );
}
