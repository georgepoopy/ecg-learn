import { prisma } from "@/lib/prisma";
import PreviewClient, { type PreviewRecord } from "./PreviewClient";

export const dynamic = "force-dynamic";

export default async function PreviewPage() {
  const types = await prisma.ecgType.findMany({
    orderBy: { order: "asc" },
    include: {
      questions: {
        take: 1,
        where: { recordId: { not: null } },
        orderBy: { id: "asc" },
        include: { record: true },
      },
    },
  });

  const records: PreviewRecord[] = types
    .filter((t) => t.questions.length > 0 && t.questions[0].record)
    .map((t) => {
      const q = t.questions[0];
      const rec = q.record!;
      return {
        typeId: t.id,
        typeName: t.name,
        shortName: t.shortName,
        recordId: rec.id,
        source: rec.source,
        externalId: rec.externalId,
        signalsB64: rec.signalsB64,
        leadOrder: JSON.parse(rec.leads) as string[],
        gain: rec.gain,
        fs: rec.fs,
        nSamples: rec.nSamples,
        leadFocus: q.leadFocus,
      };
    });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold text-clinical-700 dark:text-clinical-200">
        Waveform renderer preview
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
        One real tracing per type, drawn on a calibrated ECG grid. Adjust paper
        speed and gain to see the calibration respond.
      </p>
      <PreviewClient records={records} />
    </div>
  );
}
