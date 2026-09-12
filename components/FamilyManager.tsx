'use client';
import { useState } from 'react';
import type { FamilyMember, LocalState } from '../lib/types';
import { maskPan, member, removeMember } from '../lib/family';
import { exportBackup, validateBackup } from '../lib/backup';
export default function FamilyManager({ state, onChange }: { state: LocalState; onChange: (state: LocalState) => boolean | void }) {
  const [editing, setEditing] = useState<FamilyMember>();
  const [name, setName] = useState(''), [pan, setPan] = useState(''), [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<LocalState>();
  const reset = () => { setEditing(undefined); setName(''); setPan(''); setRevealed(false); };
  function download() {
    const url = URL.createObjectURL(new Blob([exportBackup(state)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'ipo-family-backup.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Backup downloaded. Store it securely.');
  }
  return <details className="family-manager"><summary><span>♡ &nbsp; Manage family</span><span>{state.members.length} members</span></summary><div className="family-content"><p className="muted">Names, PANs and applications stay on this device. PANs are never sent to a server.</p>
    <ul className="members">{state.members.map(m => <li key={m.id}><div><strong>{m.name}</strong><small>{maskPan(m.pan)}</small></div><div className="member-actions"><label><input type="checkbox" checked={m.enabled} onChange={e => onChange({ ...state, members: state.members.map(v => v.id === m.id ? { ...v, enabled: e.target.checked } : v) })}/>Enabled</label><button type="button" onClick={() => { setEditing(m); setName(m.name); setPan(m.pan); setRevealed(false); }}>Edit<span className="sr-only"> {m.name}</span></button><button type="button" className="danger" onClick={() => { if (window.confirm(`Delete ${m.name} and their application records?`)) { onChange(removeMember(state, m.id)); if (editing?.id === m.id) reset(); } }}>Delete<span className="sr-only"> {m.name}</span></button></div></li>)}</ul>
    <form onSubmit={e => { e.preventDefault(); try { if (!editing && state.members.length >= 100) throw new Error('The device supports up to 100 family members.'); const next = member(name, pan, editing); const saved = onChange({ ...state, members: editing ? state.members.map(m => m.id === next.id ? next : m) : [...state.members, next] }); if (saved === false) { setMessage('Could not save. Your entries are kept here so you can try again.'); return; } reset(); setMessage('Family member saved.'); } catch (error) { setMessage((error as Error).message); } }}>
      <h3>{editing ? 'Edit family member' : 'Add family member'}</h3><label>Name<input autoComplete="off" value={name} maxLength={80} required onChange={e => setName(e.target.value)}/></label><label>PAN<input type={revealed ? 'text' : 'password'} autoComplete="off" autoCapitalize="characters" spellCheck={false} value={pan} maxLength={10} required onChange={e => setPan(e.target.value.toUpperCase())}/></label><label className="reveal"><input type="checkbox" checked={revealed} onChange={e => setRevealed(e.target.checked)}/>Show PAN while editing</label><div className="actions"><button className="primary" type="submit">{editing ? 'Save changes' : 'Add member'}</button>{editing && <button type="button" onClick={reset}>Cancel</button>}</div></form>
    <div className="backup"><h3>Device backup</h3><p className="caption">This backup contains PAN information. Store it securely.</p><div className="actions"><button onClick={download}>Export backup</button><label className="button">Import backup<input className="sr-only" type="file" accept="application/json,.json" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { if (file.size > 2_000_000) throw new Error(); setPending(validateBackup(JSON.parse(await file.text()))); setMessage(''); } catch { setMessage('Invalid backup. Your existing data has not changed.'); } }}/></label></div>
    {pending && <div role="alert" className="notice"><p>Replace this device’s data with {pending.members.length} family members and their applications? Export first if you want to keep the current data.</p><button onClick={() => { if (onChange(pending) === false) { setMessage('Could not save the backup. Check device storage and try again.'); return; } setPending(undefined); reset(); setMessage('Backup imported.'); }}>Replace local data</button><button onClick={() => setPending(undefined)}>Cancel import</button></div>}</div><p role="status">{message}</p></div></details>;
}
