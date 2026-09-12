'use client';
import { useState } from 'react';
import type { FamilyMember, IPO, LocalState } from '../lib/types';
import type { AllotmentStore, StoredResult } from '../lib/allotment/types';
import { requestCheck, wait } from '../lib/allotment/client';
import { autoCheckable, registrarId, registrarLink } from '../lib/registrars';
import { allotmentInfo, formatDate } from '../lib/data';

interface Props { ipo: IPO; state: LocalState; results: AllotmentStore; today: string; onResult: (ipoId: string, memberId: string, result: StoredResult) => void }

const label = (r?: StoredResult) => !r ? undefined
  : r.status === 'allotted' ? `Allotted${r.shares != null ? ` · ${r.shares} shares` : ''}`
  : r.status === 'not_allotted' ? 'Not allotted'
  : r.status === 'pending' ? 'Pending'
  : 'Couldn’t check';

export default function AllotmentCheck({ ipo, state, results, today, onResult }: Props) {
  const [busy, setBusy] = useState<string>();
  const [copied, setCopied] = useState<string>();
  const members = state.members.filter(m => state.applications[ipo.id]?.[m.id]?.applied);
  if (!members.length) return <>None marked</>;
  const info = allotmentInfo(ipo);
  const ready = info.date != null && today >= info.date;
  const rid = registrarId(ipo.registrar?.name);
  const automatic = autoCheckable.has(rid);
  const url = registrarLink(ipo);

  async function check(member: FamilyMember) {
    const result = await requestCheck({ slug: ipo.id, registrarId: rid, pan: member.pan });
    onResult(ipo.id, member.id, { ...result, checkedAt: new Date().toISOString() });
  }
  async function checkOne(member: FamilyMember) { setBusy(member.id); try { await check(member); } finally { setBusy(undefined); } }
  async function checkAll() {
    setBusy('all');
    try { for (let i = 0; i < members.length; i++) { if (i) await wait(1000); await check(members[i]); } } finally { setBusy(undefined); }
  }
  async function copyPan(member: FamilyMember) {
    try { await navigator.clipboard.writeText(member.pan); setCopied(member.id); setTimeout(() => setCopied(undefined), 2000); } catch { /* Clipboard unavailable: PAN stays visible in Family manager. */ }
  }

  return <div className="allotment-check">
    <ul>{members.map(member => {
      const result = results.results[ipo.id]?.[member.id];
      const fallback = (!automatic || result?.status === 'error') && (ready || !automatic);
      return <li key={member.id}>
        <span className="allot-member">{member.name}</span>
        {result && <span className={`allot-status ${result.status}`} title={`Checked ${formatDate(result.checkedAt.slice(0, 10))}`}>{label(result)}</span>}
        {automatic && ready && <button className="check-button" disabled={busy != null} onClick={() => checkOne(member)}>{busy === member.id ? 'Checking…' : result ? 'Re-check' : 'Check'}</button>}
        {fallback && <span className="check-fallback">
          {url && <a href={url} target="_blank" rel="noopener noreferrer">Registrar ↗</a>}
          <button className="check-button" onClick={() => copyPan(member)}>{copied === member.id ? 'Copied' : 'Copy PAN'}</button>
        </span>}
      </li>;
    })}</ul>
    {!ready && <p className="allot-expected">{info.date ? `Allotment expected ${formatDate(info.date)}${info.estimated ? ' (est.)' : ''}` : 'Allotment date not known yet.'}</p>}
    {automatic && ready && members.length > 1 && <button className="check-button check-everyone" disabled={busy != null} onClick={checkAll}>{busy === 'all' ? 'Checking…' : 'Check everyone'}</button>}
  </div>;
}
