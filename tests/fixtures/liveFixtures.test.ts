import { describe, expect, it } from "vitest";

import { buildIndexedStations } from "../../src/lib/normalizers.js";
import {
  FuelFinderAccessTokenResponseSchema,
  FuelFinderPricePageSchema,
  FuelFinderStationPageSchema
} from "../../src/lib/schemas.js";

import accessTokenResponse from "../fixtures/fuelFinder/live/accessTokenResponse.redacted.json" with { type: "json" };
import metadata from "../fixtures/fuelFinder/live/metadata.json" with { type: "json" };
import pricesBatch1Sample from "../fixtures/fuelFinder/live/pricesBatch1.sample.json" with { type: "json" };
import stationsBatch1Sample from "../fixtures/fuelFinder/live/stationsBatch1.sample.json" with { type: "json" };

import type { RawFuelFinderPriceStation, RawFuelFinderStation } from "../../src/lib/types.js";

describe("captured live fixtures", () => {
  it("match the current Fuel Finder schemas", () => {
    const parsedTokenResponse = FuelFinderAccessTokenResponseSchema.parse(accessTokenResponse);
    const parsedStationPage = FuelFinderStationPageSchema.parse(stationsBatch1Sample);
    const parsedPricePage = FuelFinderPricePageSchema.parse(pricesBatch1Sample);

    expect(parsedTokenResponse.data.access_token).toBe("REDACTED");
    expect(parsedStationPage.data.length).toBeGreaterThan(0);
    expect(parsedPricePage.data.length).toBeGreaterThan(0);
    expect(metadata.stationBatchCount).toBeGreaterThanOrEqual(parsedStationPage.data.length);
    expect(metadata.priceBatchCount).toBeGreaterThanOrEqual(parsedPricePage.data.length);
  });

  it("builds normalized indexed stations from the captured overlapping sample", () => {
    const parsedStationPage = FuelFinderStationPageSchema.parse(stationsBatch1Sample);
    const parsedPricePage = FuelFinderPricePageSchema.parse(pricesBatch1Sample);
    const indexedStations = buildIndexedStations(
      parsedStationPage.data as RawFuelFinderStation[],
      parsedPricePage.data as RawFuelFinderPriceStation[]
    );

    expect(indexedStations.length).toBe(parsedStationPage.data.length);
    expect(indexedStations.every((station) => Array.isArray(station.qualityFlags))).toBe(true);
    expect(indexedStations.every((station) => Object.keys(station.prices).length > 0)).toBe(true);
  });
});
