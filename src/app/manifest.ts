import type { MetadataRoute } from "next";

/**
 * Web app manifest — this is what makes ECG Learn installable as an app
 * (home-screen icon, full-screen standalone window, splash screen).
 * Served by Next at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ECG Learn",
    short_name: "ECG Learn",
    description:
      "Learn 12-lead ECG interpretation with real waveforms and spaced repetition. Educational use only — not for clinical diagnosis.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0e1418",
    theme_color: "#255c6e",
    categories: ["education", "medical"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
