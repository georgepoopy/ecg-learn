import type { Metadata, Viewport } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import InstallApp from "@/components/InstallApp";
import NavLinks from "@/components/NavLinks";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/auth-actions";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  applicationName: "ECG Learn",
  title: "ECG Learn",
  description:
    "Learn ECG interpretation progressively. Educational use only — not for clinical diagnosis.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Lets iOS run it full-screen as a home-screen app.
  appleWebApp: {
    capable: true,
    title: "ECG Learn",
    statusBarStyle: "default",
  },
  // Legacy iOS full-screen flag (Next only emits the modern name).
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#255c6e",
};

/** No-flash theme init: respects saved choice, falls back to system. */
const themeScript = `
(function(){try{
  var s=localStorage.getItem('theme');
  var d=s? s==='dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(d)document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const signedIn = Boolean((session?.user as { id?: string } | undefined)?.id);
  const email = session?.user?.email ?? undefined;

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
              <InstallApp />
              {signedIn ? (
                <>
                  <NavLinks />
                  <ThemeToggle />
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      title={email}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <ThemeToggle />
                  <Link
                    href="/signin"
                    className="rounded-md bg-clinical-600 px-3 py-1 text-xs font-medium text-white hover:bg-clinical-700"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Waveforms: PTB-XL &amp; Chapman-Shaoxing/Ningbo (CC-BY 4.0), rendered
              from raw signal data. Questions authored originally.
            </span>
            <span className="flex gap-3">
              <Link href="/about" className="hover:text-clinical-600">
                About &amp; Terms
              </Link>
              <span aria-hidden>·</span>
              <span>Not for clinical diagnosis</span>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
