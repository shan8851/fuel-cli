# fuel-cli implementation plan

> Updated 2026-04-09 after the initial alpha implementation.
> This plan is now a stateful roadmap from the current repo, not a greenfield build spec.

## Current implementation status

### Done

- TypeScript CLI scaffold is in place
- package/build/lint/test wiring is in place
- `.env.example` contains Fuel Finder credential placeholders
- Fuel Finder OAuth token flow is implemented
- batched station and price fetchers are implemented
- local persistent cache and normalized station index are implemented
- `fuel near` is implemented for postcode and `lat,lon`
- `fuel station` is implemented for node ID and local text matching
- text output, JSON output, and `--output` projection are implemented
- live credential-backed smoke validation is complete
- stale-result advisories and likely test/demo station hardening are implemented
- sanitized live fixtures are captured and covered by tests
- local linked-install smoke validation is complete
- tarball install smoke validation is complete
- README now documents the JSON envelope and exit-code contract
- a first release-notes draft exists
- baseline tests and quality gates are green

### Not done

- route command
- place-name geocoding
- release packaging and publication prep
- dedicated search UX
- incremental sync support

## Milestone A — Stabilize the current alpha for release

This is the immediate milestone. No new major features should outrank this work.

### Goals

- close the remaining release-quality gaps in docs, examples, and messaging
- confirm the current v1 surface is good enough to publish without route support

### Deliverables

1. Live API validation
   - this is now complete for `near` and `station`
   - auth and batch paging assumptions have been corrected to match live behavior
   - minimal sanitized live fixtures are now in the repo for regression coverage
2. Contract hardening
   - document JSON envelope shape and error codes
   - confirm `--output` paths against real responses
   - keep stale/unknown freshness messaging aligned with live-data findings
3. Release sanity
   - built-output and local linked-install smoke validation are now complete
   - verify warm-cache vs cold-cache behavior
   - verify failure behavior when auth is missing or upstream is unavailable

### Exit criteria

- real credentials work with the current implementation
- README and docs describe the real shipped scope
- local install smoke checks pass

## Milestone B — Publishable v1 polish

This milestone is still within the same narrow feature surface.

### Goals

- make the existing commands feel complete enough for public release
- improve trust and operator visibility without expanding scope

### Deliverables

1. UX polish
   - clearer text-mode summaries
   - better ambiguity and not-found copy
   - better auth failure copy
2. Docs polish
   - richer README examples are now in place
   - output contract and exit-code examples are now in place
   - environment-variable and cache behavior docs are in place
3. Release prep
   - package metadata review
   - confirm versioning for the first publish
   - release notes draft already exists
   - tarball and linked-install validation are complete

### Exit criteria

- the current alpha can be shipped as a narrow first public release

## Milestone C — Route-aware planning

This is the highest-value next feature milestone after the current release surface is stable.

### Scope

- add `fuel route <from> <to>`
- integrate a routing provider
- score candidates using detour + price + freshness
- expose route-specific filters such as `--max-detour` and `--top`

### Dependencies

- route provider choice
- place/endpoint decisions for route inputs
- real-world validation that the current cache/index architecture is performing well enough

### Exit criteria

- route results are defensible and clearly better than raw price sorting

## Milestone D — Search and location expansion

This milestone expands input ergonomics without changing the core data model.

### Scope

- add town/city/place resolution
- optionally add dedicated `fuel search`
- improve disambiguation workflows

### Notes

- this should be done after route support or alongside it if route input UX requires it
- postcode and `lat,lon` support are enough for the first release, so this is not a blocker

## Milestone E — Data sync sophistication

Only do this once live API behavior is well understood.

### Scope

- validate and use incremental endpoints if they are reliable
- reduce full-refresh cost
- consider fallback source strategy only if the official API proves operationally weak

### Notes

- the published docs for incremental endpoints are inconsistent enough that this should be treated as a validation task, not an assumption

## Ongoing verification standards

These remain mandatory across all milestones:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

And these should be re-run after every meaningful feature milestone:

- `node dist/cli.js --help`
- `node dist/cli.js near --help`
- `node dist/cli.js station --help`

## Go / no-go for the first release

### Must be true

- `fuel near` works against real credentials
- `fuel station` works against real credentials
- cache behavior is validated on cold and warm runs
- freshness output is trustworthy
- likely test/demo forecourts no longer dominate default nearby results
- README matches reality
- all quality gates pass

### Nice to have, not required

- route support
- place-name search
- incremental sync

If the "must be true" list is green, the first release does not need to wait for route planning.
