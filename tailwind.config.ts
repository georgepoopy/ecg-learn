import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm clinical palette
        canvas: {
          light: "#f7f9fb",
          dark: "#0e1418",
        },
        ecg: {
          // ECG paper grid tones + tracing
          grid: "#e9b8b8",
          gridMinor: "#f3d6d6",
          trace: "#111827",
        },
        clinical: {
          50: "#f0f6f8",
          100: "#d9e8ee",
          200: "#b3d1dc",
          300: "#84b4c5",
          400: "#4f8fa6",
          500: "#2f7488",
          600: "#255c6e",
          700: "#204c5a",
          800: "#1d3f4b",
          900: "#1b3540",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
