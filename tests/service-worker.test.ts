// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker() {
  const entries = new Map<string, Response>();
  const cache = { match: async (key: string) => entries.get(key)?.clone(), put: async (key: string, response: Response) => { entries.set(key, response.clone()); }, addAll: vi.fn() };
  const fetcher = vi.fn();
  const context = vm.createContext({ caches: { open: async () => cache }, fetch: fetcher, Request, Response, URL, AbortController, setTimeout, clearTimeout, self: { location: { origin: 'https://example.test' }, addEventListener: vi.fn() } });
  vm.runInContext(readFileSync('public/sw.js', 'utf8'), context);
  return { entries, fetcher, request: () => vm.runInContext("market(new Request('https://example.test/data/latest.json'))", context) as Promise<Response> };
}
const data = (stamp: string, name = 'Sample') => ({ schemaVersion: 1, generatedAt: stamp, contentHash: name, ipos: [{ id: 'sample', name }] });
describe('network-first market cache', () => {
  it('returns and caches fresh online data before cached data', async () => {
    const w = worker();
    w.entries.set('/data/latest.json', Response.json(data('2026-01-01T00:00:00Z', 'Old')));
    w.fetcher.mockResolvedValue(Response.json(data('2026-01-02T00:00:00Z', 'Fresh')));
    expect((await (await w.request()).json()).ipos[0].name).toBe('Fresh');
    expect((await w.entries.get('/data/latest.json')!.json()).ipos[0].name).toBe('Fresh');
    expect(w.fetcher).toHaveBeenCalledOnce();
  });
  it('keeps previous data offline or on invalid responses', async () => {
    const w = worker();
    w.entries.set('/data/latest.json', Response.json(data('2026-01-01T00:00:00Z', 'Saved')));
    w.fetcher.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(Response.json({ ipos: [] })).mockResolvedValueOnce(new Response('bad', { status: 500 }));
    for (let n = 0; n < 3; n++) expect((await (await w.request()).json()).ipos[0].name).toBe('Saved');
  });
  it('does not regress to an older deployment', async () => {
    const w = worker();
    w.entries.set('/data/latest.json', Response.json(data('2026-01-02T00:00:00Z', 'Saved')));
    w.fetcher.mockResolvedValue(Response.json(data('2026-01-01T00:00:00Z', 'Older')));
    expect((await (await w.request()).json()).ipos[0].name).toBe('Saved');
  });
});
