import type { DashboardSummaryResponse, NextUpResponse } from '@fyp/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '../api/hooks.js';
import { MetricCard } from '../components/MetricCard.js';

/**
 * Learner dashboard (§7.1, FR-50..52). Each of the 7 proposal metrics is a
 * MetricCard: the plain-language sentence up top, a chart below. The server
 * does all the computation and wording; this page only renders.
 */
export function DashboardPage() {
  const api = useApi();
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => api.getSummary() });
  const nextUp = useQuery({ queryKey: ['next-up'], queryFn: () => api.getNextUp() });

  if (summary.isLoading) return <p className="muted">Loading your dashboard…</p>;
  if (summary.isError || !summary.data) return <p className="error">Could not load your dashboard.</p>;

  const d = summary.data;
  return (
    <div className="dashboard">
      <OverallAccuracy data={d.overallAccuracy} />
      <TopicMastery data={d.topicMastery} />
      <RetentionTrend data={d.retentionTrend} />
      <WeakConcepts data={d.weakConcepts} />
      <ResponseTime data={d.responseTime} />
      <RevisionProgress data={d.revisionProgress} />
      <LearningHistory data={d.learningHistory} />
      {nextUp.data && <NextUp data={nextUp.data} />}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  not_started: '#9ca3af',
  weak: '#ef4444',
  developing: '#f59e0b',
  mastered: '#22c55e',
};

function OverallAccuracy({ data }: { data: DashboardSummaryResponse['overallAccuracy'] }) {
  return (
    <MetricCard title="Overall accuracy" sentence={data.sentence}>
      <div className="big-number">{data.data.percent}%</div>
      {data.data.trend.length > 1 && (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data.data.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} width={30} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#2563eb" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </MetricCard>
  );
}

function TopicMastery({ data }: { data: DashboardSummaryResponse['topicMastery'] }) {
  return (
    <MetricCard title="Topic mastery" sentence={data.sentence}>
      <ResponsiveContainer width="100%" height={Math.max(120, data.data.length * 32)}>
        <BarChart data={data.data} layout="vertical" margin={{ left: 20 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="skillName" width={120} />
          <Tooltip />
          <Bar dataKey="percent" isAnimationActive={false}>
            {data.data.map((b) => (
              <rect key={b.skillId} fill={STATUS_COLOR[b.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </MetricCard>
  );
}

function RetentionTrend({ data }: { data: DashboardSummaryResponse['retentionTrend'] }) {
  return (
    <MetricCard title="Retention trend" sentence={data.sentence}>
      {data.data.length > 1 && (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} width={30} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#7c3aed" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </MetricCard>
  );
}

function WeakConcepts({ data }: { data: DashboardSummaryResponse['weakConcepts'] }) {
  return (
    <MetricCard title="Weak concepts" sentence={data.sentence}>
      <ul className="concept-list">
        {data.data.map((w) => (
          <li key={w.conceptId} className={`band-${w.band}`}>
            {w.label}
          </li>
        ))}
      </ul>
    </MetricCard>
  );
}

function ResponseTime({ data }: { data: DashboardSummaryResponse['responseTime'] }) {
  return (
    <MetricCard title="Response time" sentence={data.sentence}>
      {data.data.length > 1 && (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis width={40} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#0891b2" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </MetricCard>
  );
}

function RevisionProgress({ data }: { data: DashboardSummaryResponse['revisionProgress'] }) {
  const { dueToday, doneToday, overdue } = data.data;
  return (
    <MetricCard title="Revision progress" sentence={data.sentence}>
      <div className="stat-row">
        <div className="stat">
          <span className="n">{doneToday}</span>
          <span className="l">done today</span>
        </div>
        <div className="stat">
          <span className="n">{dueToday}</span>
          <span className="l">due today</span>
        </div>
        <div className="stat">
          <span className="n">{overdue}</span>
          <span className="l">overdue</span>
        </div>
      </div>
    </MetricCard>
  );
}

function LearningHistory({ data }: { data: DashboardSummaryResponse['learningHistory'] }) {
  return (
    <MetricCard title="Learning history" sentence={data.sentence}>
      <ul className="history-list">
        {data.data.map((s) => (
          <li key={s.sessionId}>
            <span>{new Date(s.startedAt).toLocaleDateString()}</span>
            <span>{s.strategy}</span>
            <span>{s.answered} Q</span>
            <span>{s.accuracy}%</span>
          </li>
        ))}
      </ul>
    </MetricCard>
  );
}

function NextUp({ data }: { data: NextUpResponse }) {
  return (
    <MetricCard title="What to review next" sentence={data.sentence}>
      <ul className="nextup-list">
        {data.items.map((it) => (
          <li key={`${it.reason}-${it.conceptId}`}>
            <strong>{it.label}</strong>
            <span className="muted"> — {it.reasonText.replace(/\*\*/g, '')}</span>
          </li>
        ))}
      </ul>
    </MetricCard>
  );
}
