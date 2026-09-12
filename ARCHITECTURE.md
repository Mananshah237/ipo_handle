# Stage 1 architecture
The only market source is https://gmptoday.in/api/gmp.json. A scheduled GitHub Action runs a Python standard-library normalizer, preserving last known-good static data and retaining raw snapshots only on meaningful changes. Next.js exports a static mobile app. Family members, PANs and applications live only in browser localStorage. Backups are downloaded/imported locally. No user server, database, authentication, analytics or registrar automation.

The service worker uses network-first market JSON and cache-first versioned shell assets. Hosting must deploy the static export after data commits. Upstream generation time remains the displayed freshness time of the last meaningful update.
