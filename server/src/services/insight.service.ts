import type { SelectionReason, SkillStatus } from '@fyp/shared';

/**
 * Plain-language generation for the dashboard (SPEC.md §7.2, FR-51, NFR-07).
 *
 * Pure string functions, no I/O. Learner-facing text never exposes raw
 * probabilities, ease factors, or stage names — the dashboard service hands
 * these functions already-computed, learner-safe values (percentages, bands,
 * concept labels) and gets back a sentence to show beside each chart.
 *
 * Kept separate from the dashboard service so the wording is unit-testable on
 * its own and the "no model terms" rule (NFR-07) has one place to enforce.
 */

/** Overall accuracy sentence, from a 0..100 percent and its weekly direction. */
export function accuracySentence(percent: number, trend: 'up' | 'down' | 'flat'): string {
  const p = Math.round(percent);
  if (trend === 'up') return `You're getting ${p}% right, and improving on last week.`;
  if (trend === 'down') return `You're getting ${p}% right. A little dipped from last week — keep going.`;
  return `You're getting ${p}% of questions right.`;
}

/** Topic-mastery summary across skills. */
export function masterySentence(counts: Record<SkillStatus, number>): string {
  const mastered = counts.mastered ?? 0;
  const weak = counts.weak ?? 0;
  if (mastered > 0 && weak === 0) return `You've mastered ${mastered} ${plural(mastered, 'topic')} and nothing is weak right now.`;
  if (weak > 0) return `${weak} ${plural(weak, 'topic')} ${weak === 1 ? 'needs' : 'need'} more practice. Your next session will focus ${weak === 1 ? 'on it' : 'on them'}.`;
  return `Keep practising to start mastering your topics.`;
}

/** Retention-trend sentence from the mean-retention direction. */
export function retentionTrendSentence(direction: 'up' | 'down' | 'flat', hasData: boolean): string {
  if (!hasData) return `Once you've practised a few days, you'll see how well you're holding on to what you learn.`;
  if (direction === 'up') return `You're holding on to what you've learned better than before.`;
  if (direction === 'down') return `Some of what you learned is starting to fade — a few reviews will bring it back.`;
  return `Your memory of recent topics is steady.`;
}

/** Weak-concepts sentence; `concept` is a human label, already learner-safe. */
export function weakConceptSentence(concept: string | null): string {
  if (!concept) return `Nothing looks at risk right now — nice work.`;
  return `You're starting to forget ${bold(concept)}. A quick review today will bring it back.`;
}

/** Response-time sentence from the median-time direction. */
export function responseTimeSentence(direction: 'faster' | 'slower' | 'flat', hasData: boolean): string {
  if (!hasData) return `Finish a couple of sessions to see how your answering speed changes.`;
  if (direction === 'faster') return `You're answering faster than last week.`;
  if (direction === 'slower') return `You're taking a bit longer than last week — that's fine when topics get harder.`;
  return `Your answering speed is about the same as last week.`;
}

/** Revision-progress sentence from the day's counts. */
export function revisionSentence(dueToday: number, doneToday: number, overdue: number): string {
  if (dueToday === 0 && overdue === 0) return `Nothing's due today — you're all caught up.`;
  if (overdue > 0) return `You have ${overdue} ${plural(overdue, 'review')} overdue and ${dueToday} due today.`;
  return `${doneToday} of ${dueToday} ${plural(dueToday, 'review')} done today — ${Math.max(dueToday - doneToday, 0)} to go.`;
}

/** Learning-history sentence. */
export function historySentence(sessionCount: number): string {
  if (sessionCount === 0) return `Your finished sessions will appear here.`;
  return `You've completed ${sessionCount} practice ${plural(sessionCount, 'session')}.`;
}

/** Forward-projection sentence (FR-53): days until a concept is likely forgotten. */
export function projectionSentence(concept: string, days: number): string {
  return `If you don't review ${bold(concept)}, you'll likely forget it in about ${days} ${plural(days, 'day')}.`;
}

/** Per-item "why this is next" text for the review list (FR-52, NFR-07). */
export function reasonText(reason: SelectionReason, label: string): string {
  switch (reason) {
    case 'due_review':
      return `Time to review ${bold(label)} before you forget it.`;
    case 'weak_skill':
      return `${bold(label)} needs more practice.`;
    case 'new_content':
      return `Something new to learn: ${bold(label)}.`;
    case 'reinforcement':
      return `A little more practice on ${bold(label)} to lock it in.`;
  }
}

/** Heading sentence for the whole "next up" list. */
export function nextUpSentence(count: number): string {
  if (count === 0) return `Nothing to review right now — start a new session to keep learning.`;
  return `Here ${count === 1 ? 'is' : 'are'} ${count} ${plural(count, 'thing')} worth a look next.`;
}

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}

function bold(s: string): string {
  return `**${s}**`;
}
