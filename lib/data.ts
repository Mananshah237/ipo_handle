import type { IPO, MarketData } from './types';
export const money = (value?: number) => value == null ? '—' : `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const gmpPercent = (ipo: IPO) => ipo.gmpPercent ?? (ipo.gmp != null && ipo.priceMax != null && ipo.priceMax > 0 ? ipo.gmp / ipo.priceMax * 100 : undefined);
export const formatDate = (value?: string) => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : 'Not available';
export function freshness(stamp: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(stamp)) / 60000));
  return { stale: minutes > 180, label: !Number.isFinite(minutes) ? 'Update time unavailable' : minutes < 1 ? 'Updated just now' : minutes < 60 ? `Updated ${minutes} minutes ago` : minutes < 1440 ? `Updated ${Math.floor(minutes / 60)} hours ago` : `Updated ${Math.floor(minutes / 1440)} days ago` };
}
export const istDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
// Upstream boa_date is currently null for every IPO, so fall back to the T+3
// convention: allotment on the next working day after close, labeled estimated.
export function allotmentInfo(ipo: IPO): { date?: string; estimated: boolean } {
  if (ipo.allotmentDate) return { date: ipo.allotmentDate, estimated: false };
  if (!ipo.closeDate) return { estimated: true };
  const day = new Date(`${ipo.closeDate}T12:00:00Z`);
  do { day.setUTCDate(day.getUTCDate() + 1); } while (day.getUTCDay() === 0 || day.getUTCDay() === 6);
  return { date: day.toISOString().slice(0, 10), estimated: true };
}
export function status(ipo: IPO, now = new Date()) {
  const today = istDay(now);
  if (ipo.openDate && ipo.openDate > today) return 'Upcoming';
  if (ipo.closeDate && ipo.closeDate < today) return 'Recent';
  if (ipo.openDate && ipo.closeDate && ipo.openDate <= today && ipo.closeDate >= today) return 'Open';
  return ipo.status === 'Open' ? 'Open' : ipo.status === 'Upcoming' ? 'Upcoming' : ipo.status ? 'Recent' : 'Unknown';
}
export function parseMarket(input: unknown): MarketData {
  if (!input || typeof input !== 'object') throw new Error('Invalid market data');
  const data = input as MarketData;
  if (data.schemaVersion !== 1 || typeof data.generatedAt !== 'string' || !Number.isFinite(Date.parse(data.generatedAt)) || typeof data.contentHash !== 'string' || !Array.isArray(data.ipos) || !data.ipos.length) throw new Error('Invalid market data');
  const ids = new Set<string>();
  const numeric = ['priceMin', 'priceMax', 'lotSize', 'minInvestment', 'minLots', 'gmp', 'gmpPercent', 'gmpMin', 'gmpMax', 'sourceCount', 'overallSubscription'];
  for (const ipo of data.ipos) {
    if (!ipo || typeof ipo !== 'object' || typeof ipo.id !== 'string' || !/^[a-z0-9-]+$/.test(ipo.id) || typeof ipo.name !== 'string' || !ipo.name.trim() || ids.has(ipo.id)) throw new Error('Invalid IPO');
    ids.add(ipo.id);
    const record = ipo as unknown as Record<string, unknown>;
    for (const key of numeric) if (record[key] != null && (typeof record[key] !== 'number' || !Number.isFinite(record[key]))) delete record[key];
    for (const key of ['segment', 'status', 'confidence', 'subscriptionSource', 'upiCutoff']) if (record[key] != null && typeof record[key] !== 'string') delete record[key];
    for (const key of ['openDate', 'closeDate', 'allotmentDate', 'listingDate']) if (record[key] != null && (typeof record[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record[key] as string) || !Number.isFinite(Date.parse(record[key] as string)))) delete record[key];
    ipo.history = Array.isArray(ipo.history) ? ipo.history.filter(p => p && typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(Date.parse(p.date)) && typeof p.median === 'number' && Number.isFinite(p.median)).map(p => ({ date: p.date, median: p.median, ...(Number.isFinite(p.min) ? { min: p.min } : {}), ...(Number.isFinite(p.max) ? { max: p.max } : {}) })).sort((a,b) => a.date.localeCompare(b.date)) : [];
    ipo.trackers = Array.isArray(ipo.trackers) ? ipo.trackers.filter(t => t && typeof t.name === 'string' && typeof t.gmp === 'number' && Number.isFinite(t.gmp)).map(t => ({ name: t.name, gmp: t.gmp, url: safeUrl(t.url) })) : [];
    const reg = ipo.registrar;
    ipo.registrar = reg && typeof reg === 'object' ? { name: typeof reg.name === 'string' ? reg.name : undefined, url: safeUrl(reg.url) } : undefined;
    const sub = ipo.subscription;
    ipo.subscription = Object.fromEntries(['qib', 'nii', 'retail', 'total'].flatMap(k => { const n = sub?.[k as keyof typeof sub]; return typeof n === 'number' && Number.isFinite(n) ? [[k, n]] : []; }));
  }
  return data;
}
export function safeUrl(value?: string) { try { const url = new URL(value ?? ''); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; } }
