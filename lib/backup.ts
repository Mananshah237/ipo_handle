import type { ApplicationRecord, LocalState } from './types';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9-]{1,120}$/.test(v) && !['__proto__', 'prototype', 'constructor'].includes(v);
const stamp = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function validateBackup(value: unknown): LocalState {
  const fail = () => { throw new Error('Invalid backup. Your existing data has not changed.'); };
  if (!object(value) || value.version !== 1 || !Array.isArray(value.members) || value.members.length > 100 || !object(value.applications)) return fail();
  const ids = new Set<string>();
  const members = value.members.map(m => {
    if (!object(m) || !id(m.id) || ids.has(m.id) || typeof m.name !== 'string' || !m.name.trim() || m.name.length > 80 || typeof m.pan !== 'string' || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(m.pan) || typeof m.enabled !== 'boolean' || !stamp(m.createdAt)) return fail();
    ids.add(m.id);
    return { id: m.id, name: m.name.trim(), pan: m.pan, enabled: m.enabled, createdAt: m.createdAt };
  });
  const applications: LocalState['applications'] = {};
  if (Object.keys(value.applications).length > 10000) return fail();
  for (const [ipo, records] of Object.entries(value.applications)) {
    if (!id(ipo) || !object(records)) return fail();
    const safe: Record<string, ApplicationRecord> = {};
    for (const [who, r] of Object.entries(records)) {
      if (!ids.has(who) || !object(r) || typeof r.applied !== 'boolean' || (r.appliedAt !== undefined && !stamp(r.appliedAt)) || (r.lots !== undefined && (typeof r.lots !== 'number' || !Number.isInteger(r.lots) || r.lots < 1))) return fail();
      safe[who] = { applied: r.applied, ...(r.appliedAt !== undefined ? { appliedAt: r.appliedAt as string } : {}), ...(r.lots !== undefined ? { lots: r.lots as number } : {}) };
    }
    applications[ipo] = safe;
  }
  return { version: 1, members, applications };
}
export const exportBackup = (state: LocalState) => JSON.stringify(validateBackup(state), null, 2);
