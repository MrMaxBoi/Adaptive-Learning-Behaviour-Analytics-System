import type { FinishSessionResponse, StrategyName } from '@fyp/shared';
import { useEffect, useState } from 'react';
import { useApi } from '../api/hooks.js';
import { usePractice } from '../store/practice.js';

/**
 * Practice screen (FR-10, FR-11, FR-12). Flow:
 *  1. Start a session (server plans the questions).
 *  2. Render each question; stamp render time for response-time measurement.
 *  3. On answer, send the elapsed ms; show immediate correct/explanation feedback.
 *  4. On the last question, finish the session and show a summary.
 */
export function PracticePage() {
  const api = useApi();
  const {
    sessionId,
    questions,
    index,
    questionShownAt,
    lastResult,
    answeredCount,
    startSession,
    markShown,
    recordResult,
    next,
    reset,
  } = usePractice();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<FinishSessionResponse | null>(null);

  const current = questions[index];
  const isLast = index >= questions.length - 1;

  // Stamp the render time whenever a fresh question appears (FR-11).
  useEffect(() => {
    if (current && !lastResult) markShown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?._id, lastResult]);

  async function begin(strategy: StrategyName) {
    setError(null);
    setLoading(true);
    setSummary(null);
    try {
      const res = await api.createSession(strategy);
      startSession(res.sessionId, res.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start a session.');
    } finally {
      setLoading(false);
    }
  }

  async function answer(option: string) {
    if (!sessionId || !current || submitting) return;
    const elapsed = questionShownAt ? Date.now() - questionShownAt : 0;
    setSubmitting(true);
    try {
      const res = await api.submitAnswer(sessionId, current._id, option, elapsed);
      recordResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your answer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function advance() {
    if (!sessionId) return;
    if (isLast) {
      try {
        const s = await api.finishSession(sessionId);
        setSummary(s);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not finish the session.');
      }
    } else {
      next();
    }
  }

  // ---- Render states --------------------------------------------------
  if (summary) {
    return (
      <section className="card">
        <h2>Session complete</h2>
        <p>
          You answered {summary.correct} of {summary.answered} correctly
          {summary.answered > 0 && ` (${Math.round((summary.correct / summary.answered) * 100)}%)`}.
        </p>
        <button className="primary" onClick={() => begin('adaptive')}>
          Practise again
        </button>
      </section>
    );
  }

  if (!sessionId) {
    return (
      <section className="card">
        <h2>Ready to practise?</h2>
        <p className="muted">Your session adapts to what you need to review.</p>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button className="primary" disabled={loading} onClick={() => begin('adaptive')}>
            {loading ? 'Starting…' : 'Start a session'}
          </button>
          <button className="ghost" disabled={loading} onClick={() => begin('static')}>
            Start a standard set
          </button>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <section className="card">
        <p>No questions in this session.</p>
        <button className="ghost" onClick={reset}>
          Back
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="progress">
        Question {index + 1} of {questions.length} · {answeredCount} answered
      </div>
      <h2 className="prompt">{current.prompt}</h2>
      {error && <p className="error">{error}</p>}

      <div className="options">
        {current.options.map((opt) => {
          const chosen = lastResult && opt === current.options.find((o) => o);
          let cls = 'option';
          if (lastResult) {
            if (opt === lastResult.correctAnswer) cls += ' correct';
          }
          return (
            <button
              key={opt}
              className={cls}
              disabled={!!lastResult || submitting}
              onClick={() => answer(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {lastResult && (
        <div className={`feedback ${lastResult.correct ? 'ok' : 'no'}`}>
          <strong>{lastResult.correct ? 'Correct' : 'Not quite'}</strong>
          <p>{lastResult.explanation}</p>
          <button className="primary" onClick={advance}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </section>
  );
}
