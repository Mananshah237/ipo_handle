# Stage 1 rules
1. Keep operating cost approximately $0.
2. No database.
3. No authentication.
4. No persistent user backend.
5. Public IPO data is static JSON.
6. Family/PAN data stays in browser localStorage.
7. PAN never leaves browser in Stage 1.
8. PAN never appears in logs, URLs, analytics or repository files.
9. No AI.
10. No recommendations/scores.
11. Minimal dependencies.
12. Preserve last known-good data on upstream failure.
13. Mobile-first.
14. Never fabricate missing upstream fields.
15. Do not alter ingestion architecture without approval.
16. Do not probe registrar endpoints.
17. Prefer simple understandable code.

# Stage 2 rules (allotment checker)
Stage 2 amends rules 7 and 16 for one flow only; everything else above still applies.
1. A PAN leaves the browser only when the user runs an allotment check, over HTTPS, to our stateless /api/allotment function, which forwards it to the official registrar and nothing else.
2. The function never logs, stores, or echoes the PAN or request body; it returns only {status, shares?, message?}.
3. Adapter calls go to official registrar endpoints only, one member at a time, never in parallel; captchas are relayed to the user, never solved automatically.
4. Results live only in browser localStorage (separate key from family data, never the PAN).
5. The deep link + Copy PAN fallback must always work; an error can never leave the user worse off than manual checking.
6. The static export, offline PWA and $0 GitHub pipeline stay intact; the only server piece is the Vercel function in /api pinned to bom1.
