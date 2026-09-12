'use client';
import { useCallback, useEffect, useState } from 'react';
import initial from '../data/latest.json';
import { allotmentInfo, istDay, parseMarket, status } from '../lib/data';
import { emptyState, loadState, saveState } from '../lib/family';
import { setApplied } from '../lib/applications';
import { emptyResults, loadResults, saveResults, setResult } from '../lib/allotment/results';
import { requestCheck, wait } from '../lib/allotment/client';
import type { AllotmentStore, StoredResult } from '../lib/allotment/types';
import { autoCheckable, registrarId } from '../lib/registrars';
import type { FamilyMember, IPO, LocalState } from '../lib/types';
import IPOTable from './IPOTable';
import FamilyManager from './FamilyManager';
import DataFreshness from './DataFreshness';
export default function Dashboard({ allotments = false }: { allotments?: boolean }) {
  const [data, setData] = useState(() => parseMarket(structuredClone(initial)));
  // Deterministic first render avoids hydration mismatch when an exported page crosses midnight.
  const [today, setToday] = useState(initial.generatedAt);
  const [state, setState] = useState<LocalState>(emptyState);
  const [results, setResults] = useState<AllotmentStore>(emptyResults);
  const [checkingAll, setCheckingAll] = useState(false);
  const [ready, setReady] = useState(false), [storageError, setStorageError] = useState(''), [networkError, setNetworkError] = useState('');
  const [filter, setFilter] = useState('All'), [search, setSearch] = useState(''), [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setToday(new Date().toISOString());
    setRefreshing(true);
    try { const response = await fetch('/data/latest.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new Error(); const next = parseMarket(await response.json()); setData(current => Date.parse(next.generatedAt) >= Date.parse(current.generatedAt) ? next : current); setNetworkError(navigator.onLine ? '' : 'Offline · showing saved market data.'); }
    catch { setNetworkError('Could not refresh · showing previous valid market data.'); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => {
    try { setState(loadState(localStorage)); } catch { setStorageError('Device data could not be read. Existing storage has been kept. Import a backup to recover, or check browser storage permissions.'); }
    setResults(loadResults(localStorage));
    setReady(true);
    void refresh();
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => setNetworkError('Offline installation is unavailable. You can still use the app online.'));
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const sync = () => { try { setState(loadState(localStorage)); setStorageError(''); } catch { setStorageError('Device storage could not be read.'); } };
    const timer = setInterval(visible, 5 * 60 * 1000);
    window.addEventListener('online', refresh); window.addEventListener('storage', sync); document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('storage', sync); document.removeEventListener('visibilitychange', visible); };
  }, [refresh]);
  function change(next: LocalState) { try { saveState(localStorage, next); setState(next); setStorageError(''); return true; } catch { setStorageError('Changes could not be saved. Check browser storage space and permissions, then try again.'); return false; } }
  function record(ipoId: string, memberId: string, result: StoredResult) {
    setResults(previous => {
      const next = setResult(previous, ipoId, memberId, result);
      try { saveResults(localStorage, next); } catch { setStorageError('Allotment results could not be saved on this device.'); }
      return next;
    });
  }
  const order = { Open: 0, Upcoming: 1, Recent: 2, Unknown: 3 };
  const currentDate = new Date(today);
  const day = istDay(currentDate);
  const ipos = data.ipos.filter(i => (filter === 'All' || status(i, currentDate) === filter) && i.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => (allotments ? (allotmentInfo(a).date ?? '9999').localeCompare(allotmentInfo(b).date ?? '9999') : order[status(a, currentDate)] - order[status(b, currentDate)]) || (a.closeDate ?? '9999').localeCompare(b.closeDate ?? '9999') || a.name.localeCompare(b.name));
  // Applied members whose allotment date has passed with no saved result and a checkable registrar.
  const pending: { ipo: IPO; member: FamilyMember }[] = !allotments || !ready ? [] : data.ipos.flatMap(ipo => {
    const date = allotmentInfo(ipo).date;
    if (!date || day < date || !autoCheckable.has(registrarId(ipo.registrar?.name))) return [];
    return state.members.filter(m => state.applications[ipo.id]?.[m.id]?.applied && !results.results[ipo.id]?.[m.id]).map(member => ({ ipo, member }));
  });
  async function checkPending() {
    setCheckingAll(true);
    try {
      for (let i = 0; i < pending.length; i++) {
        if (i) await wait(1000);
        const { ipo, member } = pending[i];
        const result = await requestCheck({ slug: ipo.id, registrarId: registrarId(ipo.registrar?.name), pan: member.pan });
        record(ipo.id, member.id, { ...result, checkedAt: new Date().toISOString() });
      }
    } finally { setCheckingAll(false); }
  }
  return <><header className="site-header"><a href="/" className="brand"><span className="brand-mark" aria-hidden="true">i</span><span>IPO <strong>Family</strong><small>A little clarity. All together.</small></span></a><span className="device-label">ON THIS DEVICE</span></header>
    <nav aria-label="Main navigation"><a href="/" aria-current={!allotments ? 'page' : undefined}>IPOs</a><a href="/allotments/" aria-current={allotments ? 'page' : undefined}>Allotments</a></nav>
    <main><div className="page-heading"><p className="eyebrow">YOUR FAMILY’S IPO NOTEBOOK</p><h1>{allotments ? 'Allotments, together.' : 'Keep everyone in the loop.'}</h1><p className="intro">{allotments ? 'Dates, registrars and who applied.' : 'IPO updates and family applications, in one place.'}</p></div>
      <div className="refresh-row"><DataFreshness stamp={data.generatedAt}/><button className="refresh" onClick={refresh} disabled={refreshing} aria-label="Refresh market data">{refreshing ? 'Refreshing…' : '↻ Refresh'}</button></div>
      {networkError && <p className="notice" role="status">{networkError}</p>}{storageError && <p className="notice" role="alert">{storageError}</p>}
      {ready ? <FamilyManager state={state} onChange={change}/> : <p role="status">Loading family data…</p>}
      <label className="search"><span className="sr-only">Search IPOs</span><input type="search" placeholder="Search a company…" value={search} onChange={e => setSearch(e.target.value)}/></label>
      {!allotments && <div className="filters" aria-label="IPO status">{['All', 'Open', 'Upcoming', 'Recent'].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div>}
      <p className="list-count">{ipos.length} {allotments ? 'issues' : `${filter === 'All' ? 'tracked' : filter.toLowerCase()} IPOs`}</p>
      {allotments && <p className="notice">Check sends the member’s PAN to the official registrar only, over HTTPS, when you tap it. Nothing is stored or logged outside this device.</p>}
      {pending.length > 0 && <p className="notice banner" role="status">{pending.length} allotment {pending.length === 1 ? 'result is' : 'results are'} ready to check. <button className="check-button" disabled={checkingAll} onClick={checkPending}>{checkingAll ? 'Checking…' : 'Check all now'}</button></p>}
      {ipos.length > 0 && <IPOTable ipos={ipos} state={state} currentDate={currentDate} allotments={allotments} results={results} onResult={record} onApplied={(ipo, member, checked) => change(setApplied(state, ipo, member, checked))}/>}
      {!ipos.length && <p className="empty">No IPOs match. Try another company or filter.</p>}
    </main><footer><p>Market data: <a href="https://gmptoday.in/" target="_blank" rel="noopener noreferrer">IPO GMP Today ↗</a></p><p>GMP is unofficial, not a guaranteed listing return.</p><p>Family data stays on your device; a PAN is sent to the official registrar only when you run an allotment check. Export a backup before clearing browser data.</p><details><summary>Install on your phone</summary><p>On Android, use your browser’s Install app option. On iPhone, open in Safari, tap Share, then Add to Home Screen. Open both tabs online once for offline use.</p></details></footer></>;
}
