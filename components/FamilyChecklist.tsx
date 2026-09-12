import type { LocalState } from '../lib/types';
export default function FamilyChecklist({ state, ipoId, onChange }: { state: LocalState; ipoId: string; onChange: (member: string, checked: boolean) => void }) {
  const members = state.members.filter(m => m.enabled);
  return <fieldset className="checklist"><legend>Family applications</legend>{members.length ? <div className="checks">{members.map(m => <label key={m.id}><input type="checkbox" checked={state.applications[ipoId]?.[m.id]?.applied ?? false} onChange={e => onChange(m.id, e.target.checked)} />{m.name}</label>)}</div> : <p className="muted">Add or enable family members to mark who applied.</p>}</fieldset>;
}
