import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { registrarId } from '../lib/registrars';
import { allotmentInfo } from '../lib/data';
import { emptyResults, loadResults, saveResults, setResult, RESULTS_KEY } from '../lib/allotment/results';
import { handleCheck } from '../lib/allotment/handler';
import { mockAdapter } from '../lib/allotment/adapters';
import AllotmentCheck from '../components/AllotmentCheck';
import { emptyState, member } from '../lib/family';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('normalizes inconsistent registrar names to stable ids', () => {
  expect(registrarId('KFin Technologies Limited')).toBe('kfintech');
  expect(registrarId('Kfin Technologies Limited')).toBe('kfintech');
  expect(registrarId('MUFG Intime India Private Limited')).toBe('mufg');
  expect(registrarId('Link Intime India Pvt Ltd')).toBe('mufg');
  expect(registrarId('Bigshare Services Private Limited')).toBe('bigshare');
  expect(registrarId('Maashitla Securities Private Limited')).toBe('maashitla');
  expect(registrarId('Integrated Registry Management Services Private Limited')).toBe('integrated');
  expect(registrarId('Cameo Corporate Services')).toBe('unknown');
  expect(registrarId(undefined)).toBe('unknown');
});

it('estimates the allotment date as the next working day after close', () => {
  expect(allotmentInfo({ id: 'a', name: 'A', allotmentDate: '2026-09-16' })).toEqual({ date: '2026-09-16', estimated: false });
  expect(allotmentInfo({ id: 'a', name: 'A', closeDate: '2026-09-10' })).toEqual({ date: '2026-09-11', estimated: true });
  // Friday close rolls over the weekend to Monday.
  expect(allotmentInfo({ id: 'a', name: 'A', closeDate: '2026-09-11' })).toEqual({ date: '2026-09-14', estimated: true });
  expect(allotmentInfo({ id: 'a', name: 'A' })).toEqual({ estimated: true });
});

it('stores allotment results per IPO per member and rejects invalid data', () => {
  const memory = new Map<string, string>();
  const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v) };
  const saved = setResult(emptyResults(), 'sample', 'member-1', { status: 'allotted', shares: 26, checkedAt: '2026-09-16T10:00:00Z' });
  saveResults(storage, saved);
  expect(loadResults(storage)).toEqual(saved);
  memory.set(RESULTS_KEY, 'broken json');
  expect(loadResults(storage)).toEqual(emptyResults());
  memory.set(RESULTS_KEY, JSON.stringify({ version: 1, results: { sample: { m: { status: 'hacked', checkedAt: 'x' } } } }));
  expect(loadResults(storage)).toEqual(emptyResults());
});

it('validates check requests and only ever returns the response contract', async () => {
  const table = { kfintech: mockAdapter };
  expect((await handleCheck({ slug: 'sample', registrarId: 'kfintech', pan: 'bad' }, table)).code).toBe(400);
  expect((await handleCheck({ slug: 'UPPER!', registrarId: 'kfintech', pan: 'ABCDE1234F' }, table)).code).toBe(400);
  expect((await handleCheck({ slug: 'sample', registrarId: 'sebi', pan: 'ABCDE1234F' }, table)).code).toBe(400);
  const missing = await handleCheck({ slug: 'sample', registrarId: 'maashitla', pan: 'ABCDE1234F' }, table);
  expect(missing.code).toBe(200);
  expect(missing.response.status).toBe('error');
  // Mock adapter: even last digit → allotted, odd → not allotted, zero → pending.
  const allotted = await handleCheck({ slug: 'sample', registrarId: 'kfintech', pan: 'ABCDE1234F' }, table);
  expect(allotted.response).toEqual({ status: 'allotted', shares: 52 });
  const not = await handleCheck({ slug: 'sample', registrarId: 'kfintech', pan: 'ABCDE1233F' }, table);
  expect(not.response).toEqual({ status: 'not_allotted' });
  const failing = await handleCheck({ slug: 'sample', registrarId: 'kfintech', pan: 'ABCDE1234F' }, { kfintech: async () => { throw new Error('boom'); } });
  expect(failing.response.status).toBe('error');
  expect(JSON.stringify(failing.response)).not.toContain('ABCDE');
});

const person = member('Mother', 'ABCDE1234F');
const applied = { ...emptyState(), members: [person], applications: { sample: { [person.id]: { applied: true } } } };
const kfinIpo = { id: 'sample', name: 'Sample IPO', closeDate: '2026-09-10', registrar: { name: 'KFin Technologies Limited', url: 'https://ipostatus.kfintech.com/' } };

it('shows the expected allotment date before the trigger day', () => {
  render(<AllotmentCheck ipo={kfinIpo} state={applied} results={emptyResults()} today="2026-09-10" onResult={() => {}}/>);
  expect(screen.getByText(/Allotment expected/)).toBeTruthy();
  expect(screen.getByText(/est\./)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
});

it('checks a member once the allotment date arrives and saves the result', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'allotted', shares: 26 }))));
  const onResult = vi.fn();
  render(<AllotmentCheck ipo={kfinIpo} state={applied} results={emptyResults()} today="2026-09-11" onResult={onResult}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
  await waitFor(() => expect(onResult).toHaveBeenCalled());
  const [ipoId, memberId, result] = onResult.mock.calls[0];
  expect([ipoId, memberId, result.status, result.shares]).toEqual(['sample', person.id, 'allotted', 26]);
  const sent = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
  expect(sent).toEqual({ slug: 'sample', registrarId: 'kfintech', pan: 'ABCDE1234F' });
});

it('falls back to the registrar link and Copy PAN for manual registrars', () => {
  const ipo = { ...kfinIpo, registrar: { name: 'Cameo Corporate Services', url: 'https://ipo.cameoindia.com/' } };
  render(<AllotmentCheck ipo={ipo} state={applied} results={emptyResults()} today="2026-09-11" onResult={() => {}}/>);
  expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
  expect(screen.getByRole('link', { name: /Registrar/ }).getAttribute('href')).toBe('https://ipo.cameoindia.com/');
  expect(screen.getByRole('button', { name: 'Copy PAN' })).toBeTruthy();
});
