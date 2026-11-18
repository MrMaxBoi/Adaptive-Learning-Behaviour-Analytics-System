import type { PublicQuestion } from '@fyp/shared';
import { create } from 'zustand';

/**
 * Practice session UI state. Response time (FR-11) is measured client-side:
 * `questionShownAt` is stamped when a question renders, and the elapsed time to
 * submit is sent with the answer. The store holds no answers or correctness —
 * that comes from the server per submission.
 */
interface AnswerResult {
  correct: boolean;
  correctAnswer: string;
  explanation: string;
}

interface PracticeState {
  sessionId: string | null;
  questions: PublicQuestion[];
  index: number;
  questionShownAt: number | null;
  lastResult: AnswerResult | null;
  answeredCount: number;

  startSession: (sessionId: string, questions: PublicQuestion[]) => void;
  markShown: () => void;
  recordResult: (result: AnswerResult) => void;
  next: () => void;
  reset: () => void;
}

export const usePractice = create<PracticeState>((set) => ({
  sessionId: null,
  questions: [],
  index: 0,
  questionShownAt: null,
  lastResult: null,
  answeredCount: 0,

  startSession: (sessionId, questions) =>
    set({ sessionId, questions, index: 0, questionShownAt: null, lastResult: null, answeredCount: 0 }),
  markShown: () => set({ questionShownAt: Date.now() }),
  recordResult: (result) =>
    set((s) => ({ lastResult: result, answeredCount: s.answeredCount + 1 })),
  next: () =>
    set((s) => ({ index: s.index + 1, lastResult: null, questionShownAt: null })),
  reset: () =>
    set({ sessionId: null, questions: [], index: 0, questionShownAt: null, lastResult: null, answeredCount: 0 }),
}));
