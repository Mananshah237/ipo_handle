import type { LocalState } from './types';
export function setApplied(state: LocalState, ipoId: string, memberId: string, applied: boolean): LocalState {
  const previous = state.applications[ipoId]?.[memberId];
  return { ...state, applications: { ...state.applications, [ipoId]: { ...state.applications[ipoId], [memberId]: { ...previous, applied, ...(applied ? { appliedAt: previous?.appliedAt ?? new Date().toISOString() } : {}) } } } };
}
