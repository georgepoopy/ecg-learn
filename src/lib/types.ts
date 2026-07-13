/** Shared payload types crossing the server/client boundary (no prisma imports). */

export interface QuestionOption {
  id: string;
  label: string;
}

export interface QuestionPayload {
  questionId: string;
  typeId: string;
  typeName: string;
  shortName: string;
  stem: string;
  kind: string;
  tier: string;
  options: QuestionOption[];
  leadFocus: string | null;
  /** null for authored, waveform-free items. */
  record: {
    ecgId: number;
    signalsB64: string;
    leadOrder: string[];
    gain: number;
    fs: number;
    nSamples: number;
  } | null;
  /** How many cards are due right now (for the session header). */
  dueRemaining: number;
  /** True when nothing is actually due and this is a "practice ahead" pull. */
  ahead: boolean;
}

export interface SubmitResult {
  correct: boolean;
  correctOptionId: string;
  explanation: string;
  /** Updated 0..1 mastery for the question's type. */
  typeMastery: number;
}
