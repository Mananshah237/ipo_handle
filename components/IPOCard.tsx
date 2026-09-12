import type { IPO, LocalState } from '../lib/types';
import { formatDate, money, gmpPercent, status, safeUrl } from '../lib/data';
import GMPChart from './GMPChart';
import FamilyChecklist from './FamilyChecklist';
export default function IPOCard({ ipo, state, onApplied, stage = status(ipo) }: { ipo: IPO; state: LocalState; onApplied: (member: string, checked: boolean) => void; stage?: string }) {
  const percent = gmpPercent(ipo), history = ipo.history ?? [];
  const delta = history.length > 1 ? history[history.length - 1].median - history[history.length - 2].median : undefined;
  return <article className="ipo-card"><div className="card-top"><span className="eyebrow">{ipo.segment ?? 'Segment unavailable'}</span><span className={`badge ${stage.toLowerCase()}`}>{stage}</span></div>
    <h2>{ipo.name}</h2>
    <dl className="issue-grid"><div><dt>Price band</dt><dd>{ipo.priceMin != null && ipo.priceMax != null ? `${money(ipo.priceMin)}–${money(ipo.priceMax)}` : ipo.priceMax != null ? `${money(ipo.priceMax)} (upper)` : '—'}</dd></div><div><dt>Lot size</dt><dd>{ipo.lotSize?.toLocaleString('en-IN') ?? '—'}{ipo.lotSize != null && ' shares'}</dd></div><div><dt>Min. investment</dt><dd>{money(ipo.minInvestment)}</dd></div></dl>
    <div className="gmp-strip"><div><span className="eyebrow">GMP median</span><strong>{money(ipo.gmp)}</strong></div><div><span className="eyebrow">GMP %</span><strong>{percent == null ? '—' : `${percent.toFixed(1)}%`}</strong></div><span className="trend">{delta == null ? 'No trend yet' : delta === 0 ? '→ Unchanged' : `${delta > 0 ? '↗' : '↘'} ${money(Math.abs(delta))}`}<small>daily change</small></span></div>
    <p className="range">Range {money(ipo.gmpMin)} – {money(ipo.gmpMax)}<span>{ipo.sourceCount != null ? `${ipo.sourceCount} sources` : 'Sources unavailable'}{ipo.confidence ? ` · ${ipo.confidence} confidence` : ''}</span></p>
    <dl className="subscription">{(['qib', 'nii', 'retail', 'total'] as const).map(k => <div key={k}><dt>{k === 'retail' ? 'Retail' : k === 'total' ? 'Total' : k.toUpperCase()}</dt><dd>{ipo.subscription?.[k] == null ? '—' : `${ipo.subscription[k]}×`}</dd></div>)}</dl>
    <dl className="dates"><div><dt>Closes</dt><dd>{formatDate(ipo.closeDate)}</dd></div><div><dt>Allotment</dt><dd>{formatDate(ipo.allotmentDate)}</dd></div><div><dt>Listing</dt><dd>{formatDate(ipo.listingDate)}</dd></div></dl>
    <FamilyChecklist state={state} ipoId={ipo.id} onChange={onApplied}/>
    <details className="ipo-details"><summary>GMP history & issue details <span aria-hidden="true">＋</span></summary><h3>Daily GMP</h3><GMPChart history={history}/>
      <h3>Individual trackers</h3>{ipo.trackers?.length ? <ul className="trackers">{ipo.trackers.map((t, i) => <li key={`${t.name}-${i}`}>{safeUrl(t.url) ? <a href={safeUrl(t.url)} target="_blank" rel="noopener noreferrer">{t.name} ↗</a> : t.name}<strong>{money(t.gmp)}</strong></li>)}</ul> : <p className="muted">Tracker values not available.</p>}
      <dl className="detail-list"><div><dt>Opens</dt><dd>{formatDate(ipo.openDate)}</dd></div><div><dt>Minimum lots</dt><dd>{ipo.minLots ?? 'Not available'}</dd></div><div><dt>Subscription source</dt><dd>{ipo.subscriptionSource ?? 'Not available'}</dd></div>{ipo.overallSubscription != null && <div><dt>Overall subscription*</dt><dd>{ipo.overallSubscription}×</dd></div>}<div><dt>UPI cutoff</dt><dd>{ipo.upiCutoff ?? 'Not available'}</dd></div><div><dt>Registrar</dt><dd>{ipo.registrar?.name ?? 'Not available'}</dd></div></dl>
      {ipo.overallSubscription != null && <p className="caption">*Separate upstream overall figure; may differ from the category total.</p>}
      {safeUrl(ipo.registrar?.url) && <a className="button secondary" href={safeUrl(ipo.registrar?.url)} target="_blank" rel="noopener noreferrer">Open registrar page ↗</a>}
      <p className="caption">GMP is unofficial and does not guarantee a listing return. Aggregation and confidence: IPO GMP Today.</p>
    </details></article>;
}
