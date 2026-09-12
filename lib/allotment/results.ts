import type { AllotmentStore, StoredResult } from './types';
import { allotmentStatuses } from './types';

// Results only: PANs never enter this store. Kept on a separate key from the
// family state so backups and their validation are untouched.
export const RESULTS_KEY = 'ipo-allotment-v1';
export const emptyResults = (): AllotmentStore => ({ version: 1, results: {} });

const id = (v: string) => /^[a-zA-Z0-9-]{1,120}$/.test(v) && !['__proto__', 'prototype', 'constructor'].includes(v);

function validResult(value: unknown): StoredResult | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const r = value as StoredResult;
  if (!allotmentStatuses.includes(r.status) || typeof r.checkedAt !== 'string' || !Number.isFinite(Date.parse(r.checkedAt))) return undefined;
  return {
    status: r.status,
    checkedAt: r.checkedAt,
    ...(typeof r.shares === 'number' && Number.isInteger(r.shares) && r.shares >= 0 ? { shares: r.shares } : {}),
    ...(typeof r.message === 'string' && r.message ? { message: r.message.slice(0, 300) } : {}),
  };
}

export function loadResults(storage: Pick<Storage, 'getItem'>): AllotmentStore {
  try {
    const raw = storage.getItem(RESULTS_KEY);
    if (!raw) return emptyResults();
    const parsed = JSON.parse(raw) as AllotmentStore;
    if (!parsed || parsed.version !== 1 || !parsed.results || typeof parsed.results !== 'object') return emptyResults();
    const results: AllotmentStore['results'] = {};
    for (const [ipo, records] of Object.entries(parsed.results)) {
      if (!id(ipo) || !records || typeof records !== 'object') continue;
      const safe: Record<string, StoredResult> = {};
      for (const [member, value] of Object.entries(records)) {
        const result = id(member) ? validResult(value) : undefined;
        if (result) safe[member] = result;
      }
      if (Object.keys(safe).length) results[ipo] = safe;
    }
    return { version: 1, results };
  } catch { return emptyResults(); }
}

export function saveResults(storage: Pick<Storage, 'setItem'>, store: AllotmentStore) {
  storage.setItem(RESULTS_KEY, JSON.stringify(store));
}

export function setResult(store: AllotmentStore, ipoId: string, memberId: string, result: StoredResult): AllotmentStore {
  return { ...store, results: { ...store.results, [ipoId]: { ...store.results[ipoId], [memberId]: result } } };
}
