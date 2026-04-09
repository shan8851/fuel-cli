import { describe, expect, it } from "vitest";

import { sortNearResults } from "../../src/lib/ranking.js";

import type { NearStationResult } from "../../src/lib/types.js";

const createStation = (overrides: Partial<NearStationResult>): NearStationResult => ({
  addressLine1: "1 Test Road",
  addressLine2: null,
  amenities: [],
  availableFuelTypes: ["E10"],
  brandName: "Test",
  city: "London",
  country: "England",
  county: null,
  distanceMiles: 1,
  freshnessBand: "fresh",
  freshnessMinutes: 10,
  isMotorwayServiceStation: false,
  isSupermarketServiceStation: false,
  lastUpdatedAt: "2026-04-09T10:00:00.000Z",
  nodeId: "node",
  postcode: "SE1 9SG",
  qualityFlags: [],
  selectedFuelType: "E10",
  selectedPricePencePerLitre: 130,
  tradingName: "Test",
  ...overrides
});

describe("sortNearResults", () => {
  it("prefers fresher closer stations in best mode", () => {
    const sortedStations = sortNearResults(
      [
        createStation({
          distanceMiles: 1.1,
          freshnessBand: "stale",
          freshnessMinutes: 240,
          nodeId: "b",
          selectedPricePencePerLitre: 129.9,
          tradingName: "Cheaper but stale"
        }),
        createStation({
          distanceMiles: 0.2,
          freshnessBand: "fresh",
          freshnessMinutes: 8,
          nodeId: "a",
          selectedPricePencePerLitre: 130.9,
          tradingName: "Fresh and close"
        })
      ],
      "best"
    );

    expect(sortedStations[0]?.nodeId).toBe("a");
  });

  it("penalizes likely test stations in best mode", () => {
    const sortedStations = sortNearResults(
      [
        createStation({
          distanceMiles: 1.5,
          freshnessBand: "aging",
          freshnessMinutes: 40,
          nodeId: "test-station",
          qualityFlags: ["likely_test_station"],
          selectedPricePencePerLitre: 129.9,
          tradingName: "QA Example"
        }),
        createStation({
          distanceMiles: 1.6,
          freshnessBand: "aging",
          freshnessMinutes: 45,
          nodeId: "real-station",
          selectedPricePencePerLitre: 133.9,
          tradingName: "Real Station"
        })
      ],
      "best"
    );

    expect(sortedStations[0]?.nodeId).toBe("real-station");
  });

  it("penalizes heavily stale data more than mildly stale data in best mode", () => {
    const sortedStations = sortNearResults(
      [
        createStation({
          distanceMiles: 0.6,
          freshnessBand: "stale",
          freshnessMinutes: 4000,
          nodeId: "very-stale",
          selectedPricePencePerLitre: 131.9
        }),
        createStation({
          distanceMiles: 0.8,
          freshnessBand: "stale",
          freshnessMinutes: 260,
          nodeId: "mildly-stale",
          selectedPricePencePerLitre: 133.9
        })
      ],
      "best"
    );

    expect(sortedStations[0]?.nodeId).toBe("mildly-stale");
  });

  it("sorts freshest first when requested", () => {
    const sortedStations = sortNearResults(
      [
        createStation({
          freshnessBand: "aging",
          freshnessMinutes: 80,
          nodeId: "aging"
        }),
        createStation({
          freshnessBand: "fresh",
          freshnessMinutes: 12,
          nodeId: "fresh"
        })
      ],
      "freshest"
    );

    expect(sortedStations[0]?.nodeId).toBe("fresh");
  });
});
