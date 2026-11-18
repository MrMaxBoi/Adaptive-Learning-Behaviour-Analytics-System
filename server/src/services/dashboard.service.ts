import type {
  DashboardSummaryResponse,
  NextUpResponse,
  NextUpItem,
  MasteryBar,
  SeriesPoint,
  SkillStatus,
  WeakConcept,
} from '@fyp/shared';
import { DEFAULT_SESSION_SIZE } from '@fyp/shared';
import { masteryStatus, retention, retentionBand } from '../engine/index.js';
import {
  attempts as attemptsRepo,
  coverage as coverageRepo,
  memories as memoriesRepo,
  questions as questionsRepo,
  sessions as sessionsRepo,
  skills as skillsRepo,
} from '../repositories/index.js';
import {
  accuracySentence,
  historySentence,
  masterySentence,
  nextUpSentence,
  reasonText,
  responseTimeSentence,
  retentionTrendSentence,
  revisionSentence,
  weakConceptSentence,
} from './insight.service.js';

/**
 * Dashboard read model (SPEC.md §7, FR-50..52). Reads stored records through
 * the repositories, computes the 7 proposal metrics + the review list, and
 * pairs each with a plain-language sentence from the insight service. The
 * engine's pure retention/mastery functions are reused for the derived values;
 * nothing here persists anything (NFR-02: single-pass reads, in-memory
 * aggregation).
 */

const DAY_MS = 86_400_000;

/** Map a date to a YYYY-MM-DD key in UTC (stable across the series). */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build a representative human label per concept from its questions. */
async function conceptLabels(): Promise<Map<string, string>> {
  const qs = await questionsRepo.all();
  const labels = new Map<string, string>();
  for (const q of qs) {
    if (!labels.has(q.conceptId)) {
      // Prefer the answer as the concept's "thing" (e.g. "a", "one"); fall
      // back to the prompt. Keeps labels learner-safe and short.
      labels.set(q.conceptId, q.answer || q.prompt);
    }
  }
  return labels;
}

export async function getSummary(userId: string, now = new Date()): Promise<DashboardSummaryResponse> {
  const nowMs = now.getTime();
  const [attemptDocs, covDocs, memDocs, skillDocs, sessionDocs, labels] = await Promise.all([
    attemptsRepo.listForUser(userId),
    coverageRepo.forUser(userId),
    memoriesRepo.forUser(userId),
    skillsRepo.all(),
    sessionsRepo.listForUser(userId, 50),
    conceptLabels(),
  ]);

  // ---- Overall accuracy (number + 14-day line) -------------------------
  const totalCorrect = attemptDocs.filter((a) => a.correct).length;
  const accuracyPercent = attemptDocs.length ? (totalCorrect / attemptDocs.length) * 100 : 0;
  const accTrend = dailyAccuracy(attemptDocs, nowMs, 14);
  const accDirection = seriesDirection(accTrend);

  // ---- Topic mastery (bar per skill, coloured by status) ---------------
  const covBySkill = new Map(covDocs.map((c) => [c.skillId, c]));
  const statusCounts: Record<SkillStatus, number> = {
    not_started: 0,
    weak: 0,
    developing: 0,
    mastered: 0,
  };
  const masteryBars: MasteryBar[] = skillDocs.map((s) => {
    const cov = covBySkill.get(s._id);
    const attempts = cov?.attempts ?? 0;
    const status: SkillStatus =
      cov && attempts > 0 ? masteryStatus(cov.pMastery, attempts) : 'not_started';
    statusCounts[status] += 1;
    return {
      skillId: s._id,
      skillName: s.name,
      status,
      percent: cov ? Math.round(cov.pMastery * 100) : 0,
    };
  });

  // ---- Retention trend (mean retention per day) ------------------------
  const retTrend = retentionByDay(memDocs, nowMs, 14);
  const retDirection = seriesDirection(retTrend);

  // ---- Weak concepts (lowest retention first) --------------------------
  const scored = memDocs
    .map((m) => ({
      conceptId: m.conceptId,
      r: retention(m.intervalDays, m.lastReviewedAt ? m.lastReviewedAt.getTime() : null, nowMs),
    }))
    .filter((x) => x.r > 0)
    .sort((a, b) => a.r - b.r);
  const weakConcepts: WeakConcept[] = scored
    .filter((x) => x.r < 0.8)
    .slice(0, 10)
    .map((x) => ({
      conceptId: x.conceptId,
      label: labels.get(x.conceptId) ?? x.conceptId,
      band: retentionBand(x.r),
    }));
  const weakest = weakConcepts[0] ?? null;

  // ---- Response time (median per session) ------------------------------
  const rtSeries = medianResponsePerSession(sessionDocs, attemptDocs);
  const rtDirection = responseDirection(rtSeries);

  // ---- Revision progress (due today / done today / overdue) ------------
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const todayEndMs = todayStartMs + DAY_MS;
  let dueToday = 0;
  let overdue = 0;
  for (const m of memDocs) {
    if (!m.dueAt) continue;
    const due = m.dueAt.getTime();
    if (due < todayStartMs) overdue += 1;
    else if (due < todayEndMs) dueToday += 1;
  }
  const doneToday = attemptDocs.filter((a) => a.answeredAt.getTime() >= todayStartMs).length;

  // ---- Learning history (finished sessions) ----------------------------
  const finished = sessionDocs.filter((s) => s.endedAt);
  const history = finished.map((s) => {
    const answered = s.summary?.answered ?? 0;
    const correct = s.summary?.correct ?? 0;
    return {
      sessionId: String(s._id),
      startedAt: s.startedAt.toISOString(),
      strategy: s.strategy,
      answered,
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    };
  });

  return {
    overallAccuracy: {
      sentence: accuracySentence(accuracyPercent, accDirection),
      data: { percent: Math.round(accuracyPercent), trend: accTrend },
    },
    topicMastery: {
      sentence: masterySentence(statusCounts),
      data: masteryBars,
    },
    retentionTrend: {
      sentence: retentionTrendSentence(retDirection, retTrend.length > 1),
      data: retTrend,
    },
    weakConcepts: {
      sentence: weakConceptSentence(weakest ? weakest.label : null),
      data: weakConcepts,
    },
    responseTime: {
      sentence: responseTimeSentence(rtDirection, rtSeries.length > 1),
      data: rtSeries,
    },
    revisionProgress: {
      sentence: revisionSentence(dueToday, doneToday, overdue),
      data: { dueToday, doneToday, overdue },
    },
    learningHistory: {
      sentence: historySentence(finished.length),
      data: history,
    },
  };
}

export async function getNextUp(userId: string, now = new Date()): Promise<NextUpResponse> {
  const nowMs = now.getTime();
  const [memDocs, covDocs, skillDocs, labels] = await Promise.all([
    memoriesRepo.forUser(userId),
    coverageRepo.forUser(userId),
    skillsRepo.all(),
    conceptLabels(),
  ]);

  const items: NextUpItem[] = [];

  // Due reviews first, lowest retention first (matches the adaptive pool order).
  const due = memDocs
    .filter((m) => m.dueAt && m.dueAt.getTime() <= nowMs)
    .map((m) => ({
      conceptId: m.conceptId,
      r: retention(m.intervalDays, m.lastReviewedAt ? m.lastReviewedAt.getTime() : null, nowMs),
    }))
    .sort((a, b) => a.r - b.r)
    .slice(0, DEFAULT_SESSION_SIZE);
  for (const d of due) {
    const label = labels.get(d.conceptId) ?? d.conceptId;
    items.push({ conceptId: d.conceptId, label, reason: 'due_review', reasonText: reasonText('due_review', label) });
  }

  // Then weak skills, naming the skill as the "concept" label.
  if (items.length < DEFAULT_SESSION_SIZE) {
    const skillName = new Map(skillDocs.map((s) => [s._id, s.name]));
    const weak = covDocs
      .filter((c) => c.attempts > 0 && masteryStatus(c.pMastery, c.attempts) === 'weak')
      .sort((a, b) => a.pMastery - b.pMastery);
    for (const w of weak) {
      if (items.length >= DEFAULT_SESSION_SIZE) break;
      const label = skillName.get(w.skillId) ?? w.skillId;
      items.push({ conceptId: w.skillId, label, reason: 'weak_skill', reasonText: reasonText('weak_skill', label) });
    }
  }

  return { sentence: nextUpSentence(items.length), items };
}

/* ------------------------------ helpers ------------------------------ */

function dailyAccuracy(
  attempts: Array<{ correct: boolean; answeredAt: Date }>,
  nowMs: number,
  days: number,
): SeriesPoint[] {
  const start = nowMs - (days - 1) * DAY_MS;
  const buckets = new Map<string, { c: number; n: number }>();
  for (const a of attempts) {
    const t = a.answeredAt.getTime();
    if (t < start) continue;
    const k = dayKey(a.answeredAt);
    const b = buckets.get(k) ?? { c: 0, n: 0 };
    b.n += 1;
    if (a.correct) b.c += 1;
    buckets.set(k, b);
  }
  return [...buckets.entries()]
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([date, b]) => ({ date, value: Math.round((b.c / b.n) * 100) }));
}

function retentionByDay(
  mems: Array<{ intervalDays: number; lastReviewedAt?: Date | null }>,
  nowMs: number,
  days: number,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const atMs = nowMs - d * DAY_MS;
    const vals = mems
      .map((m) => retention(m.intervalDays, m.lastReviewedAt ? m.lastReviewedAt.getTime() : null, atMs))
      .filter((r) => r > 0);
    if (!vals.length) continue;
    const mean = vals.reduce((s, r) => s + r, 0) / vals.length;
    out.push({ date: dayKey(new Date(atMs)), value: Math.round(mean * 100) });
  }
  return out;
}

function medianResponsePerSession(
  sessions: Array<{ _id: unknown; startedAt: Date }>,
  attempts: Array<{ sessionId: unknown; responseTimeMs: number }>,
): SeriesPoint[] {
  const bySession = new Map<string, number[]>();
  for (const a of attempts) {
    const key = String(a.sessionId);
    const arr = bySession.get(key) ?? [];
    arr.push(a.responseTimeMs);
    bySession.set(key, arr);
  }
  return sessions
    .map((s) => ({ s, arr: bySession.get(String(s._id)) ?? [] }))
    .filter((x) => x.arr.length > 0)
    .sort((a, b) => a.s.startedAt.getTime() - b.s.startedAt.getTime())
    .map((x) => ({ date: dayKey(x.s.startedAt), value: Math.round(median(x.arr)) }));
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Up/down/flat from the first vs. last point of a percentage series. */
function seriesDirection(series: SeriesPoint[]): 'up' | 'down' | 'flat' {
  if (series.length < 2) return 'flat';
  const diff = series[series.length - 1]!.value - series[0]!.value;
  if (diff > 2) return 'up';
  if (diff < -2) return 'down';
  return 'flat';
}

/** Faster/slower/flat from a response-time series (lower = faster). */
function responseDirection(series: SeriesPoint[]): 'faster' | 'slower' | 'flat' {
  if (series.length < 2) return 'flat';
  const diff = series[series.length - 1]!.value - series[0]!.value;
  if (diff < -50) return 'faster';
  if (diff > 50) return 'slower';
  return 'flat';
}
