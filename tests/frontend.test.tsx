import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import IPOCard from '../components/IPOCard';
import FamilyManager from '../components/FamilyManager';
import DataFreshness from '../components/DataFreshness';
import { gmpPercent, freshness, parseMarket, status } from '../lib/data';
import { emptyState, member, maskPan, removeMember, loadState, saveState } from '../lib/family';
import { setApplied } from '../lib/applications';
import { exportBackup, validateBackup } from '../lib/backup';
import fixture from '../data/latest.json';
import type { LocalState } from '../lib/types';
afterEach(() => { cleanup(); localStorage.clear(); });
// Synthetic test input is assembled at runtime; no real PAN belongs in this repository.
const testPan = () => 'ABCDE' + String(1000 + 234) + 'F';
describe('market UI', () => {
  it('renders real fixture card and daily history', () => {
    const data = parseMarket(structuredClone(fixture));
    const ipo = data.ipos.find(i => (i.history?.length ?? 0) > 1)!;
    render(<IPOCard ipo={ipo} state={emptyState()} onApplied={() => {}}/>);
    expect(screen.getByRole('heading', { name: ipo.name })).toBeTruthy();
    expect(document.querySelector('svg polyline')).toBeTruthy();
    expect(screen.getByText('GMP %')).toBeTruthy();
  });
  it('degrades gracefully without optional fields', () => {
    render(<IPOCard ipo={{ id: 'minimal', name: 'Minimal' }} state={emptyState()} onApplied={() => {}}/>);
    expect(screen.getByText('Daily GMP history is not available yet.')).toBeTruthy();
    expect(screen.getAllByText('Not available').length).toBeGreaterThan(0);
  });
  it('calculates GMP percent including zero and negatives', () => {
    expect(gmpPercent({ id: 'a', name: 'A', gmp: 25, priceMax: 100 })).toBe(25);
    expect(gmpPercent({ id: 'a', name: 'A', gmp: 0, priceMax: 100 })).toBe(0);
    expect(gmpPercent({ id: 'a', name: 'A', gmp: -10, priceMax: 100 })).toBe(-10);
    expect(gmpPercent({ id: 'a', name: 'A', gmp: 25, priceMax: 0 })).toBeUndefined();
    expect(gmpPercent({ id: 'a', name: 'A', gmpPercent: 12, gmp: 25, priceMax: 100 })).toBe(12);
  });
  it('marks stale data with upstream time', () => {
    expect(freshness('2026-01-01T00:00:00Z', Date.parse('2026-01-01T04:00:00Z')).stale).toBe(true);
    expect(freshness('2026-01-01T00:00:00Z', Date.parse('2026-01-01T00:05:00Z')).label).toBe('Updated 5 minutes ago');
    render(<DataFreshness stamp="2020-01-01T00:00:00Z"/>);
    expect(screen.getByText(/Data may be stale/)).toBeTruthy();
  });
  it('uses Indian calendar dates for status', () => {
    expect(status({ id: 'a', name: 'A', closeDate: '2026-09-11', status: 'Open' }, new Date('2026-09-11T20:00:00Z'))).toBe('Recent');
  });
  it('rejects invalid identity and tolerates malformed optional fields', () => {
    expect(() => parseMarket({ ...fixture, ipos: [] })).toThrow();
    expect(() => parseMarket({ ...fixture, ipos: [{ name: 'Missing id' }] })).toThrow();
    const data = parseMarket({ ...fixture, ipos: [{ id: 'a', name: 'A', gmp: 'bad', history: {}, registrar: { url: 'javascript:alert(1)' } }] });
    expect(data.ipos[0].gmp).toBeUndefined();
    expect(data.ipos[0].registrar?.url).toBeUndefined();
  });
});
describe('family and applications', () => {
  it('adds, edits, masks, deletes and persists members', () => {
    const m = member('Mother', testPan());
    expect(maskPan(m.pan)).toBe('ABCDE••••F');
    const edited = member('Mum', testPan(), m);
    expect(edited.id).toBe(m.id);
    const state = { ...emptyState(), members: [edited] };
    saveState(localStorage, state);
    expect(loadState(localStorage)).toEqual(state);
    expect(removeMember(state, m.id).members).toHaveLength(0);
  });
  it('keeps checkboxes separate by IPO and member and persists', () => {
    const a = member('Mother', testPan()), b = member('Father', testPan());
    const start = { ...emptyState(), members: [a,b] };
    let current = setApplied(start, 'one', a.id, true);
    current = setApplied(current, 'two', b.id, true);
    saveState(localStorage, current);
    expect(loadState(localStorage).applications.one[a.id].applied).toBe(true);
    expect(current.applications.one[b.id]).toBeUndefined();
    expect(current.applications.two[a.id]).toBeUndefined();
    const callback = vi.fn();
    render(<IPOCard ipo={{ id: 'one', name: 'One' }} state={current} onApplied={callback}/>);
    const check = screen.getByRole('checkbox', { name: 'Mother' }) as HTMLInputElement;
    expect(check.checked).toBe(true); fireEvent.click(check);
    expect(callback).toHaveBeenCalledWith(a.id, false);
    expect(removeMember(current, a.id).applications.one[a.id]).toBeUndefined();
  });
  it('family form adds and edits without revealing PAN by default', () => {
    let current: LocalState = emptyState();
    const onChange = (next: LocalState) => { current = next; };
    const view = render(<FamilyManager state={current} onChange={onChange}/>);
    fireEvent.click(screen.getByText(/Manage family/));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Mother' } });
    fireEvent.change(screen.getByLabelText('PAN'), { target: { value: testPan() } });
    expect((screen.getByLabelText('PAN') as HTMLInputElement).type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Add member' }));
    expect(current.members).toHaveLength(1);
    view.rerender(<FamilyManager state={current} onChange={onChange}/>);
    expect(screen.getByText('ABCDE••••F')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Mother' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Mum' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(current.members[0].name).toBe('Mum');
  });
});
describe('backup', () => {
  it('round trips and validates import', () => {
    const m = member('Mother', testPan());
    const state = setApplied({ ...emptyState(), members: [m] }, 'ipo', m.id, true);
    expect(validateBackup(JSON.parse(exportBackup(state)))).toEqual(state);
    for (const invalid of [{}, { ...state, version: 2 }, { ...state, members: [m,m] }, { ...state, members: [{ ...m, pan: 'invalid' }] }, { ...state, applications: { ipo: { unknown: { applied: true } } } }]) expect(() => validateBackup(invalid)).toThrow();
    expect(() => validateBackup(JSON.parse('{"version":1,"members":[],"applications":{"__proto__":{}}}'))).toThrow();
  });
});
