import type { HistoryPoint } from '../lib/types';
import { formatDate, money } from '../lib/data';
export default function GMPChart({ history = [] }: { history?: HistoryPoint[] }) {
  if (!history.length) return <p className="muted">Daily GMP history is not available yet.</p>;
  const low = Math.min(...history.map(p => p.min ?? p.median));
  const high = Math.max(...history.map(p => p.max ?? p.median));
  const start = Date.parse(history[0].date), end = Date.parse(history[history.length - 1].date);
  const x = (p: HistoryPoint) => start === end ? 180 : 45 + (Date.parse(p.date) - start) / (end - start) * 280;
  const y = (n: number) => 130 - (n - low) / (high - low || 1) * 105;
  const line = history.map(p => `${x(p)},${y(p.median)}`).join(' ');
  const range = [...history.map(p => `${x(p)},${y(p.max ?? p.median)}`), ...[...history].reverse().map(p => `${x(p)},${y(p.min ?? p.median)}`)].join(' ');
  return <div className="chart"><svg viewBox="0 0 340 160" role="img" aria-label={`Daily median GMP from ${formatDate(history[0].date)} to ${formatDate(history[history.length - 1].date)}, latest ${money(history[history.length - 1].median)}`}>
    <line x1="45" x2="325" y1="130" y2="130" stroke="#d9e1da"/><text x="0" y="30">{money(high)}</text><text x="0" y="134">{money(low)}</text>
    <polygon points={range} fill="#dcebe0"/><polyline points={line} fill="none" stroke="#276447" strokeWidth="2.5"/>
    {history.map(p => <circle key={p.date} cx={x(p)} cy={y(p.median)} r="3" fill="#276447"><title>{formatDate(p.date)}: {money(p.median)}</title></circle>)}
    <text x="45" y="155">{formatDate(history[0].date)}</text><text x="325" y="155" textAnchor="end">{formatDate(history[history.length - 1].date)}</text>
  </svg><p className="caption">Median GMP · shaded area shows tracker range</p>
  <details><summary>Daily values</summary><table><thead><tr><th>Date</th><th>Median</th><th>Range</th></tr></thead><tbody>{[...history].reverse().map(p => <tr key={p.date}><td>{formatDate(p.date)}</td><td>{money(p.median)}</td><td>{money(p.min)} – {money(p.max)}</td></tr>)}</tbody></table></details></div>;
}
