# fuel-cli product brief

> Updated 2026-04-09 after the initial alpha implementation landed.
> This document now reflects the actual repo state, not the pre-build draft.

## Product summary

`fuel-cli` is a UK-focused CLI for finding useful fuel stops from official Fuel Finder data.

It follows the same core product shape as the sibling tools:
- text in a TTY
- JSON when piped
- stable machine envelope
- clear exit codes
- useful for both humans and agents

The core product promise remains:

**"Where should I actually stop for fuel?"**

Not just:

**"What are some prices?"**

## Current state

The repo now has a working alpha with:
- TypeScript CLI scaffold and package wiring
- Fuel Finder OAuth client-credentials flow
- batched nationwide station and price ingestion
- persistent local cache + normalized local query index
- `fuel near <postcode|lat,lon>`
- `fuel station <node-id|query>`
- text/JSON output with `--output` projection
- live credential-backed validation against the official API
- nearby hardening for likely test/demo forecourts and stale-result advisories
- sanitized live API fixtures committed for regression coverage
- linked-install smoke validation from built output
- tarball install smoke validation
- README coverage for JSON envelope and exit codes
- draft release notes for `v0.1.0`
- test coverage around command contracts, provider paging/auth, cache fallback, ranking, and location parsing
- placeholder env vars in `.env.example`

What is intentionally **not** implemented yet:
- route-aware planning
- free-text place geocoding
- dedicated `search` command
- CSV fallback
- retailer-feed fallback
- publish/release packaging polish

## Chosen product decisions

These are now locked unless there is a deliberate product change:

- Data source strategy: **API-first**
- Location input support in the current alpha: **UK postcode or `lat,lon` only**
- Nearby ranking: **price + distance + freshness penalty**
- Nearby trust behavior: **likely test/demo forecourts are excluded when normal alternatives exist**
- Default fuel behavior: **`--fuel` is required**
- Station lookup: **node ID first, then cached local text matching**
- Cache strategy: **persistent user-level cache**
- Credential handling: **single active profile via env vars**

## Why the architecture looks like this

The official Fuel Finder public API is not a nearby-search API.

It exposes batched nationwide data for:
- forecourt metadata
- fuel prices
- incremental variants

That means the CLI cannot just proxy one "nearby stations" request upstream. It has to:

1. authenticate
2. page the official datasets
3. cache them locally
4. normalize them into a queryable station index
5. answer `near` and `station` from local data

That architecture is now implemented in the repo and should be treated as the foundation for all future features.

## Official source references

These are the canonical upstream references for the project:

- GOV.UK access guide:
  https://www.gov.uk/guidance/access-the-latest-fuel-prices-and-forecourt-data-via-api-or-email
- Fuel Finder public API docs:
  https://www.developer.fuel-finder.service.gov.uk/public-api
- API authentication:
  https://www.developer.fuel-finder.service.gov.uk/api-authentication
- Developer guidelines:
  https://www.developer.fuel-finder.service.gov.uk/dev-guideline
- API fields guide:
  https://www.developer.fuel-finder.service.gov.uk/api-guide

Important operational constraints from the current docs:
- OAuth 2.0 client credentials
- 30 requests per minute per client
- 1 concurrent request per client
- station-data caching guidance: 1 hour
- price-data caching guidance: 15 minutes

## Release target

The first publishable release should be a narrow, trustworthy v1:

- `fuel near` is reliable and fast on a warm cache
- `fuel station` is reliable for ID lookup and local text matching
- freshness is clearly surfaced
- low-confidence results are called out instead of silently ranked as if they were normal
- JSON output is stable enough for automation
- auth, cache, and upstream error paths are predictable

That release does **not** need route planning yet.

## Non-goals for the first release

- route detour optimization
- place-name geocoding
- EV charging support
- historical trends
- alerts
- hosted service or accounts
- consumer map app

## What should happen next

There are two distinct tracks now:

### Track 1: finish and release the current alpha

This is the immediate priority.

Needed work:
- confirm the first publish version
- do a final package metadata review before publish

### Track 2: next feature milestones

Once the current alpha is release-ready, the most valuable next features are:

1. `fuel route <from> <to>`
2. place geocoding for towns/cities
3. optional dedicated `search` command
4. incremental sync support once the real API behavior is validated against live responses
5. source fallback strategy only if the official API proves too brittle

## Product verdict

The product still earns its place in the suite because it has:
- practical daily use
- strong UK specificity
- good agent ergonomics
- a defensible CLI-first workflow

But the release discipline matters now.

The next mistake would be jumping to route planning before the current API-backed alpha has been fully fixture-backed, packaged, and polished for release.
