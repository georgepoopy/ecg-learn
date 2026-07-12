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
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        lift: "0 8px 24px -8px rgba(16,24,40,0.18)",
        glow: "0 0 0 4px rgba(47,116,136,0.14)",
      },
      keyframes: {
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(0.96)" },
          "55%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)" },
        },
        popIn: {
          "0%": { transform: "scale(0)", opacity: "0" },
          "70%": { transform: "scale(1.25)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-5px)" },
          "40%": { transform: "translateX(5px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
        successPulse: {
          "0%": { boxShadow: "0 0 0 0 rgba(16,185,129,0.45)" },
          "100%": { boxShadow: "0 0 0 12px rgba(16,185,129,0)" },
        },
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 0.3s ease-out both",
        "fade-in": "fadeIn 0.3s ease-out both",
        pop: "pop 0.3s ease-out",
        "pop-in": "popIn 0.28s cubic-bezier(0.2,0.8,0.2,1.4) both",
        shake: "shake 0.4s ease-in-out",
        "success-pulse": "successPulse 0.6s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
