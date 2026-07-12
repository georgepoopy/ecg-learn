"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  decodeSignals,
  LAYOUT_3x4,
  RHYTHM_LEAD,
  LEADS_12,
  type EcgSignal,
} from "@/lib/ecg";

export interface EcgCanvasProps {
  signalsB64: string;
  leadOrder: string[];
  /** ADU per mV, for decoding the stored Int16 signal. */
  gain: number;
  fs: number;
  nSamples: number;
  /** Paper speed, mm/s (25 standard). */
  speed: number;
  /** Amplitude gain, mm/mV (10 standard). */
  ampGain: number;
  layout?: "3x4" | "stack";
  /** Lead to spotlight (e.g. the diagnostic lead for this type). */
  highlightLead?: string | null;
  /** Backing resolution in pixels per mm (zoom). Display scales to fit. */
  pxPerMm?: number;
}

// Geometry (all in millimetres — the ECG paper's native unit).
const GUTTER_MM = 10; // left lead-in for the calibration pulse
const RIGHT_MM = 3;
const TOP_MM = 7;
const BOTTOM_MM = 6;
const ROW_GAP_MM = 26; // vertical band per 3×4 row
const RHYTHM_GAP_MM = 30;
const STACK_GAP_MM = 15;
const COL_SECONDS = 2.5; // each 3×4 column is a 2.5 s window
const TOTAL_SECONDS = 10;

interface Palette {
  paper: string;
  gridMinor: string;
  gridMajor: string;
  trace: string;
  traceHi: string;
  label: string;
}

function palette(dark: boolean): Palette {
  return dark
    ? {
        paper: "#0f171c",
        gridMinor: "rgba(248,113,113,0.13)",
        gridMajor: "rgba(248,113,113,0.30)",
        trace: "#e8edf2",
        traceHi: "#7dd3fc",
        label: "#94a3b8",
      }
    : {
        paper: "#fffdfa",
        gridMinor: "#f6d2d2",
        gridMajor: "#e79aa0",
        trace: "#161b22",
        traceHi: "#0e6b86",
        label: "#64748b",
      };
}

function isDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export default function EcgCanvas({
  signalsB64,
  leadOrder,
  gain,
  fs,
  nSamples,
  speed,
  ampGain,
  layout = "3x4",
  highlightLead = null,
  pxPerMm = 3,
}: EcgCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const signal: EcgSignal = useMemo(
    () => decodeSignals(signalsB64, leadOrder, gain, fs, nSamples),
    [signalsB64, leadOrder, gain, fs, nSamples],
  );

  // Layout metrics depend on speed (width) and layout.
  const metrics = useMemo(() => {
    const traceWidthMm = TOTAL_SECONDS * speed;
    const widthMm = GUTTER_MM + traceWidthMm + RIGHT_MM;
    let heightMm: number;
    if (layout === "3x4") {
      heightMm = TOP_MM + 3 * ROW_GAP_MM + RHYTHM_GAP_MM + BOTTOM_MM;
    } else {
      heightMm = TOP_MM + LEADS_12.length * STACK_GAP_MM + BOTTOM_MM;
    }
    return { widthMm, heightMm, traceWidthMm };
  }, [speed, layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const dark = isDark();
      const pal = palette(dark);
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const s = pxPerMm * dpr; // pixels per mm at backing resolution
      const { widthMm, heightMm } = metrics;

      canvas.width = Math.round(widthMm * s);
      canvas.height = Math.round(heightMm * s);
      canvas.style.width = `${widthMm * pxPerMm}px`;
      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.scale(s, s); // now 1 unit == 1 mm

      // Paper
      ctx.fillStyle = pal.paper;
      ctx.fillRect(0, 0, widthMm, heightMm);

      drawGrid(ctx, widthMm, heightMm, pal);

      if (layout === "3x4") {
        draw3x4(ctx, signal, { speed, ampGain, highlightLead, pal });
      } else {
        drawStack(ctx, signal, { speed, ampGain, highlightLead, pal });
      }

      ctx.restore();
    };

    draw();

    // Redraw on theme toggle.
    const obs = new MutationObserver(draw);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    // Redraw on DPR / resize changes.
    window.addEventListener("resize", draw);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [signal, metrics, speed, ampGain, layout, highlightLead, pxPerMm]);

  return (
    <div className="overflow-x-auto">
      <canvas ref={canvasRef} role="img" aria-label="12-lead ECG tracing" />
    </div>
  );
}

// --- drawing primitives (mm coordinate space) --------------------------------

function drawGrid(
  ctx: CanvasRenderingContext2D,
  widthMm: number,
  heightMm: number,
  pal: Palette,
) {
  // Minor grid: every 1 mm.
  ctx.lineWidth = 0.07;
  ctx.strokeStyle = pal.gridMinor;
  ctx.beginPath();
  for (let x = 0; x <= widthMm; x += 1) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, heightMm);
  }
  for (let y = 0; y <= heightMm; y += 1) {
    ctx.moveTo(0, y);
    ctx.lineTo(widthMm, y);
  }
  ctx.stroke();

  // Major grid: every 5 mm.
  ctx.lineWidth = 0.18;
  ctx.strokeStyle = pal.gridMajor;
  ctx.beginPath();
  for (let x = 0; x <= widthMm + 0.001; x += 5) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, heightMm);
  }
  for (let y = 0; y <= heightMm + 0.001; y += 5) {
    ctx.moveTo(0, y);
    ctx.lineTo(widthMm, y);
  }
  ctx.stroke();
}

interface TraceOpts {
  speed: number;
  ampGain: number;
  highlightLead: string | null;
  pal: Palette;
}

/** Standard 1 mV rectangular calibration pulse in the left gutter. */
function drawCalibration(
  ctx: CanvasRenderingContext2D,
  baselineMm: number,
  ampGain: number,
  pal: Palette,
) {
  const h = ampGain; // 1 mV -> ampGain mm tall
  const x0 = 2;
  const flat = 2; // mm before/after
  const pulseW = 4; // mm width of the raised part
  ctx.lineWidth = 0.3;
  ctx.strokeStyle = pal.trace;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x0, baselineMm);
  ctx.lineTo(x0 + flat, baselineMm);
  ctx.lineTo(x0 + flat, baselineMm - h);
  ctx.lineTo(x0 + flat + pulseW, baselineMm - h);
  ctx.lineTo(x0 + flat + pulseW, baselineMm);
  ctx.lineTo(x0 + flat + pulseW + flat, baselineMm);
  ctx.stroke();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  xMm: number,
  yMm: number,
  pal: Palette,
  highlight = false,
) {
  ctx.font = "600 3px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = highlight ? pal.traceHi : pal.label;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, xMm, yMm);
}

/** Plot one lead's samples over a time window [t0,t1) onto a baseline. */
function plotLead(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  fs: number,
  t0: number,
  t1: number,
  xAtT0: number,
  baselineMm: number,
  opts: TraceOpts,
  highlight: boolean,
) {
  const i0 = Math.max(0, Math.floor(t0 * fs));
  const i1 = Math.min(data.length, Math.ceil(t1 * fs));
  ctx.lineWidth = highlight ? 0.35 : 0.28;
  ctx.strokeStyle = highlight ? opts.pal.traceHi : opts.pal.trace;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = i0; i < i1; i++) {
    const t = i / fs;
    const x = xAtT0 + (t - t0) * opts.speed;
    const y = baselineMm - data[i] * opts.ampGain;
    if (i === i0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function draw3x4(ctx: CanvasRenderingContext2D, signal: EcgSignal, opts: TraceOpts) {
  const rowBaselines = [0, 1, 2].map(
    (r) => TOP_MM + ROW_GAP_MM * r + ROW_GAP_MM / 2,
  );
  const traceW = TOTAL_SECONDS * opts.speed;

  // Calibration pulse per row.
  for (const b of rowBaselines) drawCalibration(ctx, b, opts.ampGain, opts.pal);

  // Faint column separators.
  ctx.lineWidth = 0.12;
  ctx.strokeStyle = opts.pal.gridMajor;
  for (let c = 1; c < 4; c++) {
    const x = GUTTER_MM + c * COL_SECONDS * opts.speed;
    ctx.beginPath();
    ctx.moveTo(x, rowBaselines[0] - ROW_GAP_MM / 2);
    ctx.lineTo(x, rowBaselines[2] + ROW_GAP_MM / 2);
    ctx.stroke();
  }

  for (let r = 0; r < 3; r++) {
    const baseline = rowBaselines[r];
    // Clip so tall complexes don't bleed into adjacent rows.
    ctx.save();
    ctx.beginPath();
    ctx.rect(GUTTER_MM, baseline - ROW_GAP_MM / 2, traceW, ROW_GAP_MM);
    ctx.clip();
    for (let c = 0; c < 4; c++) {
      const leadName = LAYOUT_3x4[r][c];
      const data = signal.leads[leadName];
      if (!data) continue;
      const t0 = c * COL_SECONDS;
      const t1 = (c + 1) * COL_SECONDS;
      const xAtT0 = GUTTER_MM + t0 * opts.speed;
      const hi = opts.highlightLead === leadName;
      plotLead(ctx, data, signal.fs, t0, t1, xAtT0, baseline, opts, hi);
      drawLabel(ctx, leadName, xAtT0 + 1, baseline - ROW_GAP_MM / 2 + 3.2, opts.pal, hi);
    }
    ctx.restore();
  }

  // Rhythm strip (full 10 s of lead II).
  const rhythmBaseline = TOP_MM + 3 * ROW_GAP_MM + RHYTHM_GAP_MM / 2;
  drawCalibration(ctx, rhythmBaseline, opts.ampGain, opts.pal);
  ctx.save();
  ctx.beginPath();
  ctx.rect(GUTTER_MM, rhythmBaseline - RHYTHM_GAP_MM / 2, traceW, RHYTHM_GAP_MM);
  ctx.clip();
  const rhythm = signal.leads[RHYTHM_LEAD];
  if (rhythm) {
    plotLead(
      ctx, rhythm, signal.fs, 0, TOTAL_SECONDS, GUTTER_MM, rhythmBaseline, opts,
      opts.highlightLead === RHYTHM_LEAD,
    );
  }
  drawLabel(
    ctx, `${RHYTHM_LEAD} · rhythm strip`, GUTTER_MM + 1,
    rhythmBaseline - RHYTHM_GAP_MM / 2 + 3.2, opts.pal,
  );
  ctx.restore();
}

function drawStack(ctx: CanvasRenderingContext2D, signal: EcgSignal, opts: TraceOpts) {
  const traceW = TOTAL_SECONDS * opts.speed;
  for (let i = 0; i < LEADS_12.length; i++) {
    const leadName = LEADS_12[i];
    const data = signal.leads[leadName];
    const baseline = TOP_MM + STACK_GAP_MM * i + STACK_GAP_MM / 2;
    drawCalibration(ctx, baseline, opts.ampGain, opts.pal);
    if (!data) continue;
    const hi = opts.highlightLead === leadName;
    ctx.save();
    ctx.beginPath();
    ctx.rect(GUTTER_MM, baseline - STACK_GAP_MM / 2, traceW, STACK_GAP_MM);
    ctx.clip();
    plotLead(ctx, data, signal.fs, 0, TOTAL_SECONDS, GUTTER_MM, baseline, opts, hi);
    ctx.restore();
    drawLabel(ctx, leadName, GUTTER_MM + 1, baseline - STACK_GAP_MM / 2 + 3.2, opts.pal, hi);
  }
}
