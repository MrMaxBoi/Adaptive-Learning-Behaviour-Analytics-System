import type { ReactNode } from 'react';

/**
 * One dashboard metric: a title, the plain-language sentence (FR-51), and a
 * chart/children below. The sentence is the primary content — markers and
 * learners read it without decoding a chart (NFR-07).
 */
export function MetricCard({
  title,
  sentence,
  children,
}: {
  title: string;
  sentence: string;
  children?: ReactNode;
}) {
  return (
    <section className="metric">
      <h3>{title}</h3>
      <p className="sentence">{renderBold(sentence)}</p>
      {children && <div className="chart">{children}</div>}
    </section>
  );
}

/** Render **bold** spans from the insight sentences without a markdown dep. */
function renderBold(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
  );
}
