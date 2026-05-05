# ⛽ fuel-cli

[![npm version](https://img.shields.io/npm/v/@shan8851/fuel-cli.svg)](https://www.npmjs.com/package/@shan8851/fuel-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

UK fuel prices in your terminal. Built for AI agents, still useful for humans.

```bash
fuel near "SE1 9SG" --fuel E10                           # Cheapest E10 nearby
fuel near "51.501,-0.141" --fuel B7_STANDARD --radius 8mi # Diesel near coordinates
fuel station "tesco watford"                              # Station detail by name
fuel --list commute                                       # Named list from ./config.json
fuel station "<node-id>" --json --output station.prices   # Project specific fields
```

## Install

```bash
npm install -g @shan8851/fuel-cli
```

Or from source:

```bash
git clone https://github.com/shan8851/fuel-cli.git
cd fuel-cli
npm install && npm run build
npm link
```

## API Key

Fuel Finder OAuth credentials are required for live price data. Register at [gov.uk Fuel Finder](https://www.fuel-finder.service.gov.uk).

```bash
export FUEL_FINDER_CLIENT_ID=your_client_id
export FUEL_FINDER_CLIENT_SECRET=your_client_secret
# or add to .env in your project directory
```

Optional overrides:

```bash
export FUEL_FINDER_BASE_URL=https://www.fuel-finder.service.gov.uk
export FUEL_CACHE_DIR=/custom/cache/path
```

Warm cache reads work without credentials until the local station/price cache needs a refresh.

## Commands

| Command | What it does |
| --- | --- |
| `fuel near <location>` | Ranked nearby stations for a given fuel type |
| `fuel station <query>` | Station detail by node ID or text search |
| `fuel list <name>` | Station detail list loaded from `./config.json` |

Supports UK postcodes (`SE1 9SG`) and coordinates (`51.501,-0.141`).

### Options

```bash
fuel near "SE1 9SG" --fuel E10              # Required: fuel type
fuel near "SE1 9SG" --fuel E10 --radius 8mi # Radius (unitless = miles, accepts km)
fuel near "SE1 9SG" --fuel E10 --sort price  # Sort: best, price, distance, freshest
fuel near "SE1 9SG" --fuel E10 --limit 5     # Limit results
fuel near "SE1 9SG" --fuel E10 --refresh     # Force cache refresh
fuel station "tesco watford" --json          # JSON output
fuel station "<node-id>" --text              # Force text output
fuel list commute                            # Named station list from ./config.json
fuel --list commute                          # Shortcut for `fuel list commute`
```

**Fuel types:** `E10`, `E5`, `B7_STANDARD`, `B7_PREMIUM`, `B10`, `HVO`

### Named Station Lists

Create `config.json` in the directory where you run `fuel`:

```json
{
  "commute": {
    "fuel": "B7_STANDARD",
    "stations": [
      {
        "searchText": "MFG BLUECOATS [ESSO]",
        "display": "Bluecoats (home route)",
        "sort": 2
      },
      {
        "searchText": "TESCO WATFORD",
        "sort": 1
      }
    ]
  }
}
```

Then run:

```bash
fuel list commute
# or
fuel --list commute
```

Optional per-station **`sort`** (number): lower values appear first. Omitted entries sort after any that define `sort`. In colour text mode, **prices** use rank-based tinting: the **cheapest 20%** of rows are green, the **most expensive 40%** are red, with a smooth ramp in between; names are plain.

## Agent Integration

The CLI defaults to **colorized text in a TTY** and **JSON when piped** — no flag needed.

```bash
fuel near "SE1 9SG" --fuel E10 --json        # Explicit JSON
fuel near "SE1 9SG" --fuel E10 | jq          # Auto-JSON when piped
fuel near "SE1 9SG" --fuel E10 --no-color    # Plain text without ANSI colors
fuel station "<node-id>" --output station.prices.0.pencePerLitre
```

Every response uses a stable envelope:

```json
{
  "ok": true,
  "schemaVersion": "1",
  "command": "near",
  "requestedAt": "2026-04-09T13:45:15.016Z",
  "data": { ... }
}
```

Errors return `ok: false` with structured `error.code`, `error.message`, and `error.retryable` fields. Exit codes: `0` success, `2` bad input/ambiguity, `3` upstream failure, `4` internal error.

Use `--output <path>` when an agent only needs one field or subtree. Paths use dot notation with zero-based array indexes.

```bash
fuel near "SE1 9SG" --fuel E10 --output stations.0.selectedPricePencePerLitre
fuel station "<node-id>" --output station.prices.0.pencePerLitre
fuel near "SE1 9SG" --fuel E10 --json --output quality
```

In text mode, scalar projections print just the value. Object and array projections print plain JSON.

Works with [OpenClaw](https://github.com/openclaw/openclaw), Claude Desktop MCP, or any agent that can shell out.

## Examples

```bash
# Cheapest E10 near Waterloo
$ fuel near "SE1 9SG" --fuel E10 --sort price --limit 3
Tesco Waterloo Express   | 134.9p  | 0.8 mi  | fresh
Sainsbury's Waterloo     | 135.9p  | 1.1 mi  | fresh
BP Waterloo              | 142.9p  | 0.4 mi  | aging

# Station detail
$ fuel station "tesco watford"
Tesco Watford Extra
  24h Colne Valley Rd, Watford WD23 9QJ
  E10  134.9p  ● fresh (12 min ago)
  E5   139.9p  ● fresh (12 min ago)
  B7   140.9p  ● fresh (12 min ago)

# Agent-ready: just the cheapest price
$ fuel near "SE1 9SG" --fuel E10 --output stations.0.selectedPricePencePerLitre
134.9
```

## Notes

- `fuel near` requires `--fuel` so petrol and diesel results are never mixed into one ranking.
- V1 supports UK postcodes and `lat,lon` inputs only.
- Likely test/demo forecourts are excluded when normal alternatives exist.
- Stale or missing price timestamps produce data-quality advisories.
- Route planning and free-text place geocoding are not in this release.

## Development

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

To refresh the sanitized live API fixtures used in tests:

```bash
pnpm fixtures:capture:live
```

## License

MIT
