# Implementation
Tickets 0–7 implemented: live schema; safe sync/tests; mobile list; family manager; applications/backups; GMP detail; action; PWA. Ticket 8 completed: verification and documentation.

## Stage 2 tickets
Ticket 8 (dates & registrars): upstream `boa_date` is mapped but null for all 36 IPOs (verified against the live API on 2026-09-12), so `allotmentInfo` in `lib/data.ts` estimates the next working day after close, labeled "est." everywhere it renders. The Python date parser now also accepts "Sept"/"September" so real boa_dates parse on arrival. Registrar names normalize to ids in `lib/registrars.ts`; matching never uses display names.

Ticket 9 (checker skeleton): `lib/allotment/` holds the adapter interface, mock adapter (enable with ALLOTMENT_MOCK=1 on Vercel), request handler, browser client and localStorage results store; `api/allotment.ts` is the stateless Vercel function (bom1 via vercel.json); `components/AllotmentCheck.tsx` renders per-member Check/Re-check once today ≥ allotment date, "Check everyone" sequentially 1s apart, a pending-checks banner on the allotments page, and the deep link + Copy PAN fallback for manual registrars and errors.

Ticket 10 (owner task, then adapters): perform one real MUFG Intime and one real KFin lookup in Safari DevTools with an applied PAN. Capture for each: endpoint URLs in call order, HTTP methods, request bodies, request headers, cookies set along the way, any CSRF/session token flow (which call issues it, where it must be echoed), and the exact response shape for allotted / not allotted / not found. Sanitise the PAN and any personal values before handing the capture over. Adapters then slot into `lib/allotment/adapters.ts` behind the existing interface.

Ticket 11 (detail panel layout): the daily GMP values, the tracker list and the QIB/NII/Retail block are CSS grid rows, not tables — no `<table>` remains inside `IPOCard`. Daily rows are `4.5rem 1fr auto` ("12 Sept ₹1,325 ₹1,250–₹1,400" on one line), ranges use an unspaced en dash so they cannot break mid-value, and `font-variant-numeric: tabular-nums` aligns digits in all three blocks. `GMPChart` shows the 7 most recent days with a "Show all N days" toggle that expands in place, so it is now a client component.

Repository was empty. Ruflo/ToolSearch capabilities were searched for but are unavailable in this session.

## Fixture inspection
Live API fetched directly on 2026-09-12 IST; upstream generated_at: 2026-09-12T02:49:36+05:30. 35 IPOs. Structured `open_iso`/`close_iso`, `est_listing_pct`, `min_investment`, `min_lots`, `registrar.name/url`, and daily `history.date/median/min/max` exist. `boa_date` was null in this fixture. `price_band` is numeric upper issue price. `sub_cats.total` and `subscription` sometimes differ. No HTML, scores, fundamentals or recommendation content enters latest.json.

## Verification
5 Python tests pass: live parsing, missing optionals, required fields, meaningful hash, unchanged/failure preservation. 13 Vitest tests pass: rendering/history, missing values, GMP %, freshness, IST filtering, defensive market parser, family CRUD/masking, local persistence, application separation, backup validation and network-first worker behavior. Production dependency audit: zero reported vulnerabilities. Final build/lint/typecheck and browser checks recorded at completion.

Windows sandbox blocks child build/test workers and Python temporary folder access; approved local runs were used for those checks. No runtime backend or secrets were introduced.

Browser QA caught an ambiguous upstream name: `median_pct` is a graphic marker position, not GMP %. Normalization uses `est_listing_pct`, verified against median/upper price and covered by a regression assertion.

Ticket 11 was measured in headless Edge at true 320 px and 390 px viewports (the page under test in a fixed-width iframe, since headless Edge clamps its own window to 504 px). At both widths `documentElement.scrollWidth` equals `innerWidth`, every date, median, range, tracker value and subscription multiple is a single unclipped line, and each daily row is 39 px. Long tracker *names* still wrap, which is intended; numeric values never do.

Final verification: production static export passes, ESLint passes, TypeScript passes. Browser QA at 390 x 844 verified readable layout, open filtering, search, corrected GMP percentage, expanded SVG history and tracker values. With the local HTTP server stopped, both routes loaded from the service worker and allotment search remained interactive. Actual phone installation and hosted CDN behavior remain deployment checks.
