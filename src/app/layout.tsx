import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import NavLinks from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECG Learn",
  description:
    "Learn ECG interpretation progressively. Educational use only — not for clinical diagnosis.",
};

/** No-flash theme init: respects saved choice, falls back to system. */
const themeScript = `
(function(){try{
  var s=localStorage.getItem('theme');
  var d=s? s==='dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(d)document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen flex flex-col">
        {/* Persistent, unmissable education-only disclaimer. */}
        <div
          role="note"
          className="sticky top-0 z-50 bg-amber-100 text-amber-900 text-center text-xs font-medium py-1.5 px-3 border-b border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900"
        >
          ⚕ Educational tool for learning ECG interpretation — <strong>not for clinical diagnosis.</strong>
        </div>

        <header className="sticky top-[29px] z-40 border-b border-slate-200 bg-canvas-light/80 backdrop-blur dark:border-slate-800 dark:bg-canvas-dark/80">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2.5">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-clinical-700 dark:text-clinical-200"
            >
              <span aria-hidden className="text-clinical-500">〜</span>
              ECG&nbsp;Learn
            </Link>
            <div className="flex items-center gap-3">
              <NavLinks />
              <ThemeToggle />
            </div>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
          Waveforms: PTB-XL (Wagner et al., 2020), CC-BY 4.0 — rendered from raw
          signal data. Questions authored originally. See ATTRIBUTION.md.
        </footer>
      </body>
    </html>
  );
}
