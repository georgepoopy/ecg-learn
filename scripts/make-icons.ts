/**
 * Generate the PWA / home-screen app icons from a single vector source.
 * Run: npm run make:icons
 *
 * Produces (in public/): icon-192.png, icon-512.png, icon-maskable-512.png,
 * apple-touch-icon.png (180), favicon.ico + favicon-32.png. These back the
 * installable "app" — the icon you see on a phone home screen / desktop.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public");
fs.mkdirSync(OUT, { recursive: true });

// Brand: clinical-600 -> clinical-800 (see tailwind.config.ts), white ECG trace.
const BG_FROM = "#2f7488";
const BG_TO = "#1d3f4b";
const TRACE = "#ffffff";

/**
 * A clean single-beat ECG tracing (P-QRS-T) drawn across the tile.
 * `inset` shrinks the artwork toward the centre so maskable icons keep their
 * content inside the platform's safe zone.
 */
function svg(size: number, { maskable = false }: { maskable?: boolean } = {}): string {
  const radius = maskable ? 0 : Math.round(size * 0.22); // full-bleed when maskable
  const pad = maskable ? size * 0.2 : size * 0.14; // safe-zone inset
  const w = size - pad * 2;
  const midY = size / 2;
  const s = w / 100; // horizontal scale (path authored on a 0..100 grid)
  const x = (u: number) => pad + u * s;
  const y = (dv: number) => midY - dv * (size * 0.0032); // dv in "mm", up = positive

  // P wave, PR flat, Q dip, R spike, S dip, ST flat, T wave, back to baseline.
  const d = [
    `M ${x(0)} ${y(0)}`,
    `L ${x(14)} ${y(0)}`,
    `Q ${x(20)} ${y(14)} ${x(26)} ${y(0)}`, // P
    `L ${x(38)} ${y(0)}`,
    `L ${x(42)} ${y(-16)}`, // Q
    `L ${x(48)} ${y(78)}`, // R
    `L ${x(54)} ${y(-30)}`, // S
    `L ${x(60)} ${y(0)}`,
    `L ${x(70)} ${y(0)}`,
    `Q ${x(80)} ${y(34)} ${x(90)} ${y(0)}`, // T
    `L ${x(100)} ${y(0)}`,
  ].join(" ");

  const stroke = Math.max(6, Math.round(size * 0.045));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG_FROM}"/>
      <stop offset="1" stop-color="${BG_TO}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#g)"/>
  <path d="${d}" fill="none" stroke="${TRACE}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-linejoin="round" opacity="0.97"/>
</svg>`;
}

async function png(size: number, file: string, opts?: { maskable?: boolean }) {
  const buf = Buffer.from(svg(size, opts));
  await sharp(buf).png().toFile(path.join(OUT, file));
  console.log("wrote", file);
}

async function main() {
  await png(192, "icon-192.png");
  await png(512, "icon-512.png");
  await png(512, "icon-maskable-512.png", { maskable: true });
  await png(180, "apple-touch-icon.png");
  await png(32, "favicon-32.png");
  // favicon.ico (32px) for the browser tab.
  await sharp(Buffer.from(svg(32)))
    .resize(32, 32)
    .toFormat("png")
    .toFile(path.join(OUT, "favicon.ico"));
  console.log("wrote favicon.ico");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
