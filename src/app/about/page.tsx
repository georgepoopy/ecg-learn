import Link from "next/link";

export const metadata = {
  title: "About & Terms · ECG Learn",
  description: "About ECG Learn, its data sources and licenses, and terms of use.",
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold text-clinical-700 dark:text-clinical-200">{children}</h2>;
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <h1 className="text-2xl font-semibold text-clinical-700 dark:text-clinical-200">About ECG Learn</h1>

      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <strong>Not for clinical diagnosis.</strong> ECG Learn is an educational
        tool for learning to interpret 12-lead ECGs. It is <strong>not</strong> a
        medical device, is not intended to diagnose, treat, or manage any patient,
        and must never be used to make clinical decisions. If you have a health
        concern, seek advice from a qualified clinician.
      </div>

      <H>What it is</H>
      <p className="mt-2">
        ECG Learn teaches ECG interpretation progressively. You study one ECG type
        at a time, unlock its questions into a personal spaced-repetition bank, and
        drill with immediate feedback. Every waveform shown is a <strong>real
        tracing plotted from raw digital signal arrays</strong> — never a scraped or
        copied image.
      </p>

      <H>Data sources &amp; licenses</H>
      <p className="mt-2">
        Waveforms come only from openly licensed, published datasets. We attribute
        each per its license (full detail in the repository&apos;s
        <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">DATA_SOURCES.md</code>).
      </p>
      <ul className="mt-2 space-y-2">
        <li>
          <strong>PTB-XL</strong> (CC-BY 4.0) — Wagner P., Strodthoff N.,
          Bousseljot R.-D., et al. (2020), <em>PTB-XL, a large publicly available
          electrocardiography dataset</em>, PhysioNet.{" "}
          <span className="text-slate-400">doi:10.13026/kfzx-aw45</span>
        </li>
        <li>
          <strong>Chapman-Shaoxing &amp; Ningbo</strong> (CC-BY 4.0) — Zheng J.,
          Guo H., Chu H. (2022), <em>A large scale 12-lead electrocardiogram
          database for arrhythmia study</em>, PhysioNet.{" "}
          <span className="text-slate-400">doi:10.13026/wgex-er52</span>
        </li>
      </ul>
      <p className="mt-2">
        Both datasets are used under the{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          className="text-clinical-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Creative Commons Attribution 4.0 International (CC-BY 4.0)
        </a>{" "}
        license.
      </p>

      <H>How the questions are made</H>
      <p className="mt-2">
        All lessons, questions, distractors, and explanations are{" "}
        <strong>authored originally</strong> from standard, settled ECG criteria
        (rate, rhythm, interval, and morphology). Nothing is scraped or copied from
        websites, textbooks, or question banks. Where a fact is ambiguous, or a
        topic is authored from scratch (e.g. certain expert patterns), it is routed
        to clinician review and <strong>held out of the live practice bank</strong>{" "}
        until verified.
      </p>

      <H>Terms of use</H>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Educational use only. The content is provided &ldquo;as is&rdquo;, without warranty of any kind.</li>
        <li>Nothing here is medical advice, and it does not establish a clinician–patient relationship.</li>
        <li>Do not enter real patient data or any protected health information (PHI). Questions use de-identified, published research recordings.</li>
        <li>Respect the CC-BY 4.0 terms of the underlying datasets, including attribution, if you reuse the waveforms.</li>
      </ul>

      <H>Privacy</H>
      <p className="mt-2">
        Creating an account stores your email, a securely hashed password, and your
        learning progress so your bank is private to you. No medical information
        about you is collected. You can stop using the service at any time.
      </p>

      <div className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
        <Link href="/" className="text-clinical-600 hover:underline">← Back to ECG Learn</Link>
      </div>
    </div>
  );
}
