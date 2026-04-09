import { describe, expect, it } from "vitest";

import { buildNearQualitySummary, getStationQualityFlags } from "../../src/lib/dataQuality.js";

import type { NearStationResult } from "../../src/lib/types.js";

describe("data quality helpers", () => {
  it("flags obvious test/demo station names without matching normal names", () => {
    expect(getStationQualityFlags("QA Riverside", "Tesco")).toEqual(["likely_test_station"]);
    expect(getStationQualityFlags("Whitestiles Service Station", "Esso")).toEqual([]);
  });

  it("adds an all-stale advisory when every returned result is stale or unknown", () => {
    const nearStations: NearStationResult[] = [
      {
        addressLine1: "1 Test Road",
        addressLine2: null,
        amenities: [],
        availableFuelTypes: ["E10"],
        brandName: "Brand",
        city: "London",
        country: "England",
        county: null,
        distanceMiles: 1,
        freshnessBand: "stale",
        freshnessMinutes: 400,
        isMotorwayServiceStation: false,
        isSupermarketServiceStation: false,
        lastUpdatedAt: "2026-04-09T10:00:00.000Z",
        nodeId: "stale",
        postcode: "SE1 9SG",
        qualityFlags: [],
        selectedFuelType: "E10",
        selectedPricePencePerLitre: 140,
        tradingName: "Station stale"
      },
      {
        addressLine1: "1 Test Road",
        addressLine2: null,
        amenities: [],
        availableFuelTypes: ["E10"],
        brandName: "Brand",
        city: "London",
        country: "England",
        county: null,
        distanceMiles: 1,
        freshnessBand: "unknown",
        freshnessMinutes: null,
        isMotorwayServiceStation: false,
        isSupermarketServiceStation: false,
        lastUpdatedAt: null,
        nodeId: "unknown",
        postcode: "SE1 9SG",
        qualityFlags: [],
        selectedFuelType: "E10",
        selectedPricePencePerLitre: 140,
        tradingName: "Station unknown"
      }
    ];
    const qualitySummary = buildNearQualitySummary(
      nearStations,
      1
    );

    expect(qualitySummary.advisories.map((advisory) => advisory.code)).toEqual([
      "LIKELY_TEST_STATIONS_EXCLUDED",
      "ALL_RESULTS_STALE_OR_UNKNOWN"
    ]);
  });
});
