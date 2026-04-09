# fuel-cli execution backlog

> Updated 2026-04-09 after the alpha implementation.
> This backlog is now split into completed baseline work, next release tasks, and later roadmap items.

## Baseline complete

- [x] Bootstrap the repo with TypeScript, pnpm, tsup, Vitest, and ESLint
- [x] Add Fuel Finder credential placeholders in `.env.example`
- [x] Implement shared output envelope and error contract
- [x] Implement command registration for `near` and `station`
- [x] Implement Fuel Finder OAuth token generation
- [x] Implement sequential batched station and price ingestion
- [x] Implement persistent user-level cache and normalized station index
- [x] Implement postcode lookup via Postcodes.io
- [x] Implement postcode and `lat,lon` parsing
- [x] Implement nearby ranking using price + distance + freshness
- [x] Implement `fuel near`
- [x] Implement `fuel station`
- [x] Add `--output` projection support
- [x] Add fixtures and tests for command contract, providers, cache, ranking, and location parsing
- [x] Get `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` green

## Next release tasks

These are the highest-priority remaining tasks before a first public release.

- [x] Run initial live smoke tests with real Fuel Finder credentials
- [x] Correct live API mismatches discovered during smoke validation
  - read endpoints return top-level arrays, not the documented `{ data: [...] }` wrapper
  - paging terminates with `404` after the last batch instead of an empty final page
- [x] Verify warm-cache and cold-cache behavior against the real API
- [x] Harden nearby ranking against likely test/demo forecourts and heavily stale live data
- [x] Surface stale-data advisories in JSON and text output
- [x] Capture small real-world fixtures from live responses and update tests beyond synthetic fixtures
- [x] Polish auth error messaging based on real runs
- [x] Expand README examples using real command output shape
- [x] Document JSON envelope examples and exit-code behavior clearly
- [x] Run local linked-install smoke tests from built output
- [x] Run tarball install smoke tests from packed artifact
- [x] Draft first release notes
- [ ] Confirm the first publish version

## Candidate fixes after live validation

These are not guaranteed to be needed, but they are the most likely corrective tasks once real credentials are used.

- [x] Tighten Fuel Finder response parsing to accept the live array response shape
- [x] Adjust paging termination logic for the live `404 after last batch` behavior
- [x] Demote or exclude likely test/demo forecourts from default nearby results
- [x] Add live-data advisories when returned prices are mostly stale or unknown
- [ ] Refine ambiguity matching if station-name collisions are too noisy in real data
- [ ] Improve cache fallback behavior if upstream latency or auth expiry behaves differently than expected

## Post-v1 feature roadmap

These are intentionally not release blockers for the current alpha.

- [ ] Add `fuel route <from> <to>` with detour-aware ranking
- [ ] Choose and integrate a routing provider
- [ ] Add place-name geocoding for towns and cities
- [ ] Decide whether to add a dedicated `fuel search` command
- [ ] Validate and use incremental Fuel Finder endpoints if they are reliable
- [ ] Consider source fallback strategy only if the official API needs resilience help

## Explicitly deferred

- [ ] EV charging support
- [ ] alerts
- [ ] historical trends
- [ ] accounts or hosted service
- [ ] consumer map UI
