# fuel-cli v0.1.0 release notes

## Summary

First public release candidate for the API-first `fuel-cli` alpha.

This version ships the core local-index workflow on top of the official Fuel Finder API:
- `fuel near <postcode|lat,lon> --fuel <type>`
- `fuel station <node-id|query>`
- text output in a TTY, JSON when piped
- `--output` projection for machine use

## Highlights

- OAuth client-credentials flow against the Fuel Finder API
- sequential nationwide station and price ingestion with persistent local cache
- nearby ranking using price, distance, and freshness
- live-data hardening for likely test/demo forecourts and stale-price advisories
- sanitized live API fixtures committed for regression coverage
- linked-install smoke validation from built output

## Verified Behavior

- Fuel Finder read endpoints return top-level arrays in live responses
- Fuel Finder paging terminates with `404` after the last batch
- warm-cache and cold-cache flows both work with real credentials
- likely test/demo forecourts are excluded from nearby results when normal alternatives exist
- stale or unknown prices surface warnings in both text and JSON output

## Known Limitations

- no `fuel route` command yet
- no free-text town/city/place geocoding yet
- no dedicated `fuel search` command yet
- no incremental sync path yet
- no tarball publication metadata beyond the package essentials

## Remaining Release Tasks

- confirm the first publish version
- do a final package metadata review before publishing
