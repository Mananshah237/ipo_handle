/* Public market JSON only. No family data is read or written by this worker. */
const VERSION = /* BUILD_VERSION */ "dev";
const SHELL = `ipo-shell-${VERSION}`;
const DATA = 'ipo-market-v1';
const ASSETS = /* SHELL_ASSETS */ ["/", "/allotments/", "/manifest.json"];
const MARKET = '/data/latest.json';
function valid(data) {
  return data && data.schemaVersion === 1 && typeof data.generatedAt === 'string' && Number.isFinite(Date.parse(data.generatedAt)) && typeof data.contentHash === 'string' && Array.isArray(data.ipos) && data.ipos.length > 0 && data.ipos.every(i => i && typeof i.id === 'string' && /^[a-z0-9-]+$/.test(i.id) && typeof i.name === 'string' && i.name.trim());
}
async function market(request) {
  const cache = await caches.open(DATA);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
    if (!response.ok || !valid(await response.clone().json())) throw new Error('Invalid market response');
    const previous = await cache.match(MARKET);
    if (previous) {
      const old = await previous.clone().json();
      const fresh = await response.clone().json();
      if (valid(old) && Date.parse(old.generatedAt) > Date.parse(fresh.generatedAt)) return previous;
    }
    // A storage quota error must not hide fresh valid network data.
    try { await cache.put(MARKET, response.clone()); } catch { /* Keep serving the network response. */ }
    return response;
  } catch {
    const previous = await cache.match(MARKET);
    return previous || new Response('Market data unavailable', { status: 503 });
  } finally { clearTimeout(timer); }
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(ASSETS);
    await market(new Request(new URL(MARKET, self.location.origin)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('ipo-shell-') && key !== SHELL) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === MARKET) { event.respondWith(market(event.request)); return; }
  // Only cache known build assets; never cache arbitrary URLs or third-party pages.
  if (!ASSETS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(url.pathname, response.clone());
    return response;
  })());
});
