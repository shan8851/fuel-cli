import { describe, expect, it, vi } from "vitest";

import { createAmbiguousQueryError } from "../src/lib/errors.js";

import {
  createStubFuelService,
  resetTestState,
  runCli,
  sampleNearCommandData,
  sampleStationCommandData,
  stripAnsi
} from "./helpers.js";

import type { Advisory } from "../src/lib/types.js";

resetTestState();

describe("fuel cli", () => {
  const staleNearAdvisory = {
    code: "ALL_RESULTS_STALE_OR_UNKNOWN",
    message: "All returned prices are stale or missing timestamps. Treat the ranking as approximate.",
    severity: "warning"
  } satisfies Advisory;
  const staleStationAdvisory = {
    code: "ALL_PRICES_STALE_OR_UNKNOWN",
    message: "All listed prices are stale or missing timestamps. Treat them as low-confidence.",
    severity: "warning"
  } satisfies Advisory;

  it("shows top-level help without credentials", async () => {
    const result = await runCli(["--help"], {
      fuelService: createStubFuelService()
    });

    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("fuel near");
    expect(stripAnsi(result.stdout)).toContain("fuel station");
  });

  it("returns structured json for near", async () => {
    const fuelService = createStubFuelService({
      findStationsNear: vi.fn(async () => sampleNearCommandData)
    });
    const result = await runCli(["near", "SE1 9SG", "--fuel", "E10", "--json"], {
      fuelService
    });

    expect(result.exitCode).toBe(0);
    expect(fuelService.findStationsNear).toHaveBeenCalledWith("SE1 9SG", {
      fuelType: "E10",
      limit: 10,
      radiusMiles: 5,
      refresh: false,
      sort: "best"
    });
    expect(JSON.parse(result.stdout)).toMatchObject({
      command: "near",
      data: {
        quality: {
          excludedLikelyTestStations: 0
        },
        stations: [
          {
            nodeId: "node-1",
            selectedPricePencePerLitre: 132.9
          }
        ]
      },
      ok: true
    });
  });

  it("defaults to json when stdout is not a tty", async () => {
    const result = await runCli(
      ["station", "node-1"],
      {
        fuelService: createStubFuelService({
          findStation: vi.fn(async () => sampleStationCommandData)
        })
      },
      {
        isTTY: false
      }
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      command: "station",
      ok: true
    });
  });

  it("supports projected json output", async () => {
    const result = await runCli(
      ["near", "SE1 9SG", "--fuel", "E10", "--json", "--output", "stations.0.nodeId"],
      {
        fuelService: createStubFuelService({
          findStationsNear: vi.fn(async () => sampleNearCommandData)
        })
      }
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      data: "node-1",
      ok: true
    });
  });

  it("returns a structured error when json and text are both selected", async () => {
    const result = await runCli(
      ["near", "SE1 9SG", "--fuel", "E10", "--json", "--text"],
      {
        fuelService: createStubFuelService({
          findStationsNear: vi.fn(async () => sampleNearCommandData)
        })
      }
    );

    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({
      command: "near",
      error: {
        code: "INVALID_INPUT",
        message: "Choose either --json or --text, not both."
      },
      ok: false
    });
  });

  it("renders text output for station in a tty", async () => {
    const result = await runCli(
      ["station", "node-1", "--text"],
      {
        fuelService: createStubFuelService({
          findStation: vi.fn(async () => sampleStationCommandData)
        })
      },
      {
        isTTY: true
      }
    );

    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Tesco Riverside");
    expect(stripAnsi(result.stdout)).toContain("Prices");
  });

  it("renders near advisories in text mode", async () => {
    const result = await runCli(
      ["near", "SE1 9SG", "--fuel", "E10", "--text"],
      {
        fuelService: createStubFuelService({
          findStationsNear: vi.fn(async () => ({
            ...sampleNearCommandData,
            quality: {
              ...sampleNearCommandData.quality,
              advisories: [staleNearAdvisory]
            }
          }))
        })
      },
      {
        isTTY: true
      }
    );

    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Warning: All returned prices are stale or missing timestamps.");
  });

  it("renders station advisories in text mode", async () => {
    const result = await runCli(
      ["station", "node-1", "--text"],
      {
        fuelService: createStubFuelService({
          findStation: vi.fn(async () => ({
            ...sampleStationCommandData,
            quality: {
              advisories: [staleStationAdvisory]
            }
          }))
        })
      },
      {
        isTTY: true
      }
    );

    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Warning: All listed prices are stale or missing timestamps.");
  });

  it("returns ambiguity errors in json mode", async () => {
    const result = await runCli(
      ["station", "london", "--json"],
      {
        fuelService: createStubFuelService({
          findStation: vi.fn(async () => {
            throw createAmbiguousQueryError("london", [
              {
                addressLine1: "1 River Road",
                brandName: "Tesco",
                nodeId: "node-1",
                postcode: "SE1 9SG",
                tradingName: "Tesco Riverside"
              }
            ]);
          })
        })
      }
    );

    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({
      command: "station",
      error: {
        code: "AMBIGUOUS_QUERY"
      },
      ok: false
    });
  });
});
