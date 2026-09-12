import type { FamilyMember, LocalState } from './types';
import { validateBackup } from './backup';
export const STORAGE_KEY = 'ipo-family-v1';
export const emptyState = (): LocalState => ({ version: 1, members: [], applications: {} });
export const maskPan = (pan: string) => `${pan.slice(0, 5)}••••${pan.slice(-1)}`;
export const validPan = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
export function member(name: string, pan: string, previous?: FamilyMember): FamilyMember {
  name = name.trim(); pan = pan.trim().toUpperCase();
  if (!name || name.length > 80 || !validPan(pan)) throw new Error('Enter a name and a valid 10-character PAN.');
  return { id: previous?.id ?? crypto.randomUUID(), name, pan, enabled: previous?.enabled ?? true, createdAt: previous?.createdAt ?? new Date().toISOString() };
}
export function removeMember(state: LocalState, id: string): LocalState {
  return { ...state, members: state.members.filter(m => m.id !== id), applications: Object.fromEntries(Object.entries(state.applications).map(([ipo, records]) => [ipo, Object.fromEntries(Object.entries(records).filter(([key]) => key !== id))])) };
}
export function loadState(storage: Pick<Storage, 'getItem'>): LocalState { const raw = storage.getItem(STORAGE_KEY); return raw ? validateBackup(JSON.parse(raw)) : emptyState(); }
export function saveState(storage: Pick<Storage, 'setItem'>, state: LocalState) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
