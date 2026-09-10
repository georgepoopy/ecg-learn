"use client";

import { useEffect, useState } from "react";

/**
 * "Install app" affordance + service-worker registration.
 *
 * - Registers /sw.js so the site is installable and static assets are cached.
 * - On Chrome/Edge/Android it captures `beforeinstallprompt` and shows a button
 *   that fires the native install dialog.
 * - On iOS/iPadOS Safari (no such event) it shows a short "Add to Home Screen"
 *   hint instead, since Apple only allows manual install.
 * - Renders nothing once the app is already installed (running standalone).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true); // assume installed until we know otherwise (avoids flash)
  const [isIOS, setIsIOS] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const nav = navigator as Navigator & { standalone?: boolean };
    const installed =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    setStandalone(installed);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !installed);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already running as an installed app, or nothing to offer on this browser.
  if (standalone) return null;
  if (!deferred && !isIOS) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setShowIosHelp((v) => !v);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 rounded-md border border-clinical-300 bg-clinical-50 px-2 py-1 text-xs font-medium text-clinical-700 hover:bg-clinical-100 dark:border-clinical-700 dark:bg-clinical-900/40 dark:text-clinical-200 dark:hover:bg-clinical-900"
      >
        <span aria-hidden>⤓</span> Install app
      </button>
      {showIosHelp && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lift dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          To install on iPhone or iPad: tap the <strong>Share</strong> button{" "}
          <span aria-hidden>􀈂</span> in Safari, then choose{" "}
          <strong>Add to Home Screen</strong>.
          <button
            onClick={() => setShowIosHelp(false)}
            className="mt-2 block text-clinical-600 hover:underline dark:text-clinical-300"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
