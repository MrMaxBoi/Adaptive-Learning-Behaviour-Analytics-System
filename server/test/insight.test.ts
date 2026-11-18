import { describe, expect, it } from 'vitest';
import type { SkillStatus } from '@fyp/shared';
import {
  accuracySentence,
  historySentence,
  masterySentence,
  nextUpSentence,
  projectionSentence,
  reasonText,
  responseTimeSentence,
  retentionTrendSentence,
  revisionSentence,
  weakConceptSentence,
} from '../src/services/insight.service.js';

/**
 * Plain-language rules (§7.2, FR-51, NFR-07). The load-bearing assertion is
 * NFR-07: learner-facing text must never leak model terms. Every sentence the
 * service can produce is checked against a banned-vocabulary list.
 */

const BANNED = [
  'probability',
  'ease factor',
  'easefactor',
  'bkt',
  'sm-2',
  'sm2',
  'half-life',
  'pmastery',
  'ptransit',
  'cold_start',
  'cold start',
  'foundation_building',
  'core_practice',
  'adaptive_review',
  'advanced_expansion',
  'retention probability',
];

function assertNoModelTerms(s: string): void {
  const lower = s.toLowerCase();
  for (const term of BANNED) {
    expect(lower, `"${s}" leaks model term "${term}"`).not.toContain(term);
  }
}

const EVERY_STATUS: SkillStatus[] = ['not_started', 'weak', 'developing', 'mastered'];

describe('insight service — NFR-07 (no model terms)', () => {
  it('accuracy sentences avoid model terms in every direction', () => {
    for (const dir of ['up', 'down', 'flat'] as const) {
      assertNoModelTerms(accuracySentence(73, dir));
    }
  });

  it('mastery sentences avoid stage/model terms', () => {
    const counts = Object.fromEntries(EVERY_STATUS.map((s) => [s, 1])) as Record<SkillStatus, number>;
    assertNoModelTerms(masterySentence(counts));
    assertNoModelTerms(masterySentence({ not_started: 2, weak: 0, developing: 0, mastered: 3 }));
    assertNoModelTerms(masterySentence({ not_started: 5, weak: 0, developing: 0, mastered: 0 }));
  });

  it('retention / response / revision / history sentences are clean', () => {
    for (const d of ['up', 'down', 'flat'] as const) assertNoModelTerms(retentionTrendSentence(d, true));
    assertNoModelTerms(retentionTrendSentence('flat', false));
    for (const d of ['faster', 'slower', 'flat'] as const) assertNoModelTerms(responseTimeSentence(d, true));
    assertNoModelTerms(revisionSentence(3, 1, 2));
    assertNoModelTerms(revisionSentence(0, 0, 0));
    assertNoModelTerms(historySentence(0));
    assertNoModelTerms(historySentence(4));
  });

  it('weak-concept, projection and reason text are clean', () => {
    assertNoModelTerms(weakConceptSentence('あ'));
    assertNoModelTerms(weakConceptSentence(null));
    assertNoModelTerms(projectionSentence('いち', 5));
    for (const r of ['due_review', 'weak_skill', 'new_content', 'reinforcement'] as const) {
      assertNoModelTerms(reasonText(r, 'Hiragana vowels'));
    }
    assertNoModelTerms(nextUpSentence(0));
    assertNoModelTerms(nextUpSentence(3));
  });
});

describe('insight service — wording behaviour', () => {
  it('accuracy reflects direction', () => {
    expect(accuracySentence(80, 'up')).toContain('improving');
    expect(accuracySentence(80, 'down')).toContain('dipped');
    expect(accuracySentence(80.4, 'flat')).toContain('80%');
  });

  it('mastery prioritises weak-topic guidance', () => {
    expect(masterySentence({ not_started: 0, weak: 2, developing: 1, mastered: 1 })).toContain('more practice');
    expect(masterySentence({ not_started: 0, weak: 0, developing: 0, mastered: 2 })).toContain('mastered');
  });

  it('revision singular/plural and overdue wording', () => {
    expect(revisionSentence(1, 0, 0)).toContain('review');
    expect(revisionSentence(5, 2, 0)).toContain('reviews');
    expect(revisionSentence(3, 0, 2)).toContain('overdue');
  });

  it('reason text names the item for each reason', () => {
    expect(reasonText('due_review', 'kana a')).toContain('kana a');
    expect(reasonText('new_content', 'numbers')).toContain('numbers');
  });
});
