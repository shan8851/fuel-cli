import { describe, expect, it, vi } from "vitest";

import { createFuelService } from "../../src/lib/fuelService.js";
import { buildIndexedStations } from "../../src/lib/normalizers.js";

import pricesPage1 from "../fixtures/fuelFinder/pricesPage1.json" with { type: "json" };
import stationsPage1 from "../fixtures/fuelFinder/stationsPage1.json" with { type: "json" };

import type { IndexedStation, PostcodesClient } from "../../src/lib/types.js";

const datasetStations = buildIndexedStations(stationsPage1.data, pricesPage1.data);

const replaceStation = (
  stations: IndexedStation[],
  nodeId: string,
  overrides: Partial<IndexedStation>
): IndexedStation[] =>
  stations.map((station) =>
    station.nodeId === nodeId
      ? {
          ...station,
          ...overrides
        }
      : station
  );

const createDatasetStore = (stations: IndexedStation[] = datasetStations) => ({
  getDataset: vi.fn(async () => ({
    builtAt: "2026-04-09T10:05:00.000Z",
    priceSourceCachedAt: "2026-04-09T10:05:00.000Z",
    stationSourceCachedAt: "2026-04-09T10:05:00.000Z",
    stations
  }))
});

const postcodesClient: PostcodesClient = {
  lookupPostcode: vi.fn(async () => ({
    latitude: 51.4989,
    longitude: -0.1113,
    postcode: "SE1 9SG"
  }))
};

describe("createFuelService", () => {
  it("returns ranked nearby stations", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T10:10:00.000Z"));

    const fuelService = createFuelService(createDatasetStore(), postcodesClient);
    const result = await fuelService.findStationsNear("SE1 9SG", {
      fuelType: "E10",
      limit: 5,
      radiusMiles: 5,
      refresh: false,
      sort: "best"
    });

    expect(result.stations[0]?.nodeId).toBe("node-1");
    expect(result.resolvedLocation.postcode).toBe("SE1 9SG");
    expect(result.quality.advisories).toEqual([]);

    vi.useRealTimers();
  });

  it("excludes likely test stations from near results when normal alternatives exist", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T10:10:00.000Z"));

    const stations = replaceStation(datasetStations, "node-1", {
      qualityFlags: ["likely_test_station"],
      tradingName: "QA Riverside"
    });
    const fuelService = createFuelService(createDatasetStore(stations), postcodesClient);
    const result = await fuelService.findStationsNear("SE1 9SG", {
      fuelType: "E10",
      limit: 5,
      radiusMiles: 5,
      refresh: false,
      sort: "best"
    });

    expect(result.stations[0]?.nodeId).toBe("node-2");
    expect(result.stations.some((station) => station.nodeId === "node-1")).toBe(false);
    expect(result.quality.excludedLikelyTestStations).toBe(1);
    expect(result.quality.advisories.map((advisory) => advisory.code)).toContain("LIKELY_TEST_STATIONS_EXCLUDED");

    vi.useRealTimers();
  });

  it("keeps likely test stations when they are the only nearby results", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T10:10:00.000Z"));

    const onlyTestStation = replaceStation([datasetStations[0]].filter((station): station is IndexedStation => station !== undefined), "node-1", {
      qualityFlags: ["likely_test_station"],
      tradingName: "QA Riverside"
    });
    const fuelService = createFuelService(createDatasetStore(onlyTestStation), postcodesClient);
    const result = await fuelService.findStationsNear("SE1 9SG", {
      fuelType: "E10",
      limit: 5,
      radiusMiles: 5,
      refresh: false,
      sort: "best"
    });

    expect(result.stations[0]?.nodeId).toBe("node-1");
    expect(result.stations[0]?.qualityFlags).toEqual(["likely_test_station"]);
    expect(result.quality.excludedLikelyTestStations).toBe(0);

    vi.useRealTimers();
  });

  it("returns a single station for unique text matches", async () => {
    const fuelService = createFuelService(createDatasetStore(), postcodesClient);
    const result = await fuelService.findStation("tesco riverside", {
      refresh: false
    });

    expect(result.station.nodeId).toBe("node-1");
  });

  it("rejects empty station queries before reading the dataset", async () => {
    const datasetStore = createDatasetStore();
    const fuelService = createFuelService(datasetStore, postcodesClient);

    await expect(
      fuelService.findStation("   ", {
        refresh: false
      })
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Expected station query to be a non-empty node ID or text search."
    });
    expect(datasetStore.getDataset).not.toHaveBeenCalled();
  });

  it("returns station advisories when all prices are stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T10:10:00.000Z"));

    const stalePriceStation = replaceStation(datasetStations, "node-1", {
      prices: {
        E10: {
          effectiveAt: "2026-04-08T09:45:00.000Z",
          fuelType: "E10",
          lastUpdatedAt: "2026-04-08T10:00:00.000Z",
          pencePerLitre: 132.9
        }
      }
    });
    const fuelService = createFuelService(createDatasetStore(stalePriceStation), postcodesClient);
    const result = await fuelService.findStation("tesco riverside", {
      refresh: false
    });

    expect(result.quality.advisories.map((advisory) => advisory.code)).toContain("ALL_PRICES_STALE_OR_UNKNOWN");

    vi.useRealTimers();
  });

  it("returns ambiguity errors for multiple local text matches", async () => {
    const fuelService = createFuelService(createDatasetStore(), postcodesClient);

    await expect(
      fuelService.findStation("london", {
        refresh: false
      })
    ).rejects.toMatchObject({
      code: "AMBIGUOUS_QUERY"
    });
  });
});
