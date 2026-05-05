import { mkdir, writeFile } from "node:fs/promises";

import { loadConfig } from "../src/lib/config.js";
import { FUEL_FINDER_BATCH_TIMEOUT_MS } from "../src/lib/constants.js";
import { createAppError, toAppError } from "../src/lib/errors.js";
import {
  FuelFinderAccessTokenResponseSchema,
  FuelFinderPricePageSchema,
  FuelFinderStationPageSchema
} from "../src/lib/schemas.js";
import { requestJson } from "../src/providers/requestJson.js";

import type { RawFuelFinderPriceStation, RawFuelFinderStation } from "../src/lib/types.js";

const DEFAULT_SAMPLE_SIZE = 5;
const REDACTED_TOKEN_VALUE = "REDACTED";

const parseSampleSize = (argumentsList: string[]): number => {
  const sampleSizeFlagIndex = argumentsList.findIndex((argument) => argument === "--sample-size");

  if (sampleSizeFlagIndex === -1) {
    return DEFAULT_SAMPLE_SIZE;
  }

  const value = Number(argumentsList[sampleSizeFlagIndex + 1]);

  if (!Number.isInteger(value) || value <= 0) {
    throw createAppError("INVALID_INPUT", "Expected --sample-size to be a positive integer.");
  }

  return value;
};

const sanitizeTokenResponse = (
  tokenResponse: ReturnType<typeof FuelFinderAccessTokenResponseSchema.parse>
): ReturnType<typeof FuelFinderAccessTokenResponseSchema.parse> => ({
  ...tokenResponse,
  data: {
    ...tokenResponse.data,
    access_token: REDACTED_TOKEN_VALUE,
    ...(tokenResponse.data.refresh_token !== undefined
      ? {
          refresh_token: tokenResponse.data.refresh_token === null ? null : REDACTED_TOKEN_VALUE
        }
      : {})
  }
});

const writeJsonFile = async (path: URL, value: unknown): Promise<void> => {
  await writeFile(path, JSON.stringify(value, null, 2));
};

const hasNormalizableLocation = (station: RawFuelFinderStation): boolean =>
  Boolean(station.location.address_line_1?.trim()) &&
  Boolean(station.location.city?.trim()) &&
  Boolean(station.location.country?.trim()) &&
  Boolean(station.location.postcode?.trim()) &&
  station.location.latitude !== null &&
  station.location.longitude !== null;

const selectLiveFixtureSamples = (
  stationBatch: RawFuelFinderStation[],
  priceBatch: RawFuelFinderPriceStation[],
  sampleSize: number
): {
  priceSample: RawFuelFinderPriceStation[];
  sharedNodeIds: string[];
  stationSample: RawFuelFinderStation[];
} => {
  const pricedNodeIds = new Set(priceBatch.map((station) => station.node_id));
  const stationSample = stationBatch
    .filter((station) => pricedNodeIds.has(station.node_id) && hasNormalizableLocation(station))
    .slice(0, sampleSize);

  if (stationSample.length === 0) {
    throw createAppError("INTERNAL_ERROR", "Could not find overlapping station and price records in the live first batch.");
  }

  const sharedNodeIds = stationSample.map((station) => station.node_id);
  const sharedNodeIdSet = new Set(sharedNodeIds);
  const priceSample = priceBatch.filter((station) => sharedNodeIdSet.has(station.node_id));

  return {
    priceSample,
    sharedNodeIds,
    stationSample
  };
};

const run = async (): Promise<void> => {
  const sampleSize = parseSampleSize(process.argv.slice(2));
  const config = loadConfig();

  if (!config.fuelFinderClientId || !config.fuelFinderClientSecret) {
    throw createAppError(
      "AUTH_ERROR",
      "Missing Fuel Finder credentials. Set FUEL_FINDER_CLIENT_ID and FUEL_FINDER_CLIENT_SECRET before capturing live fixtures."
    );
  }

  const fixtureDirectory = new URL("../tests/fixtures/fuelFinder/live/", import.meta.url);

  await mkdir(fixtureDirectory, {
    recursive: true
  });

  const tokenResponse = await requestJson({
    body: JSON.stringify({
      client_id: config.fuelFinderClientId,
      client_secret: config.fuelFinderClientSecret
    }),
    headers: {
      "content-type": "application/json"
    },
    label: "Fuel Finder access token request",
    method: "POST",
    schema: FuelFinderAccessTokenResponseSchema,
    url: new URL("/api/v1/oauth/generate_access_token", config.fuelFinderBaseUrl)
  });
  const accessToken = tokenResponse.data.access_token;
  const tokenType = tokenResponse.data.token_type;
  const stationBatchResponse = await requestJson({
    headers: {
      authorization: `${tokenType} ${accessToken}`
    },
    label: "Fuel Finder stations batch 1",
    schema: FuelFinderStationPageSchema,
    timeoutMs: FUEL_FINDER_BATCH_TIMEOUT_MS,
    url: new URL("/api/v1/pfs?batch-number=1", config.fuelFinderBaseUrl)
  });
  const priceBatchResponse = await requestJson({
    headers: {
      authorization: `${tokenType} ${accessToken}`
    },
    label: "Fuel Finder prices batch 1",
    schema: FuelFinderPricePageSchema,
    timeoutMs: FUEL_FINDER_BATCH_TIMEOUT_MS,
    url: new URL("/api/v1/pfs/fuel-prices?batch-number=1", config.fuelFinderBaseUrl)
  });
  const { priceSample, sharedNodeIds, stationSample } = selectLiveFixtureSamples(
    stationBatchResponse.data as RawFuelFinderStation[],
    priceBatchResponse.data as RawFuelFinderPriceStation[],
    sampleSize
  );
  const metadata = {
    baseUrl: config.fuelFinderBaseUrl,
    capturedAt: new Date().toISOString(),
    notes: "Sanitized live fixture capture. Access tokens are redacted and station/price batches are reduced to overlapping sample records.",
    priceBatchCount: priceBatchResponse.data.length,
    priceSampleCount: priceSample.length,
    sampleSizeRequested: sampleSize,
    sharedNodeIds,
    stationBatchCount: stationBatchResponse.data.length,
    stationSampleCount: stationSample.length
  };

  await Promise.all([
    writeJsonFile(new URL("accessTokenResponse.redacted.json", fixtureDirectory), sanitizeTokenResponse(tokenResponse)),
    writeJsonFile(new URL("stationsBatch1.sample.json", fixtureDirectory), stationSample),
    writeJsonFile(new URL("pricesBatch1.sample.json", fixtureDirectory), priceSample),
    writeJsonFile(new URL("metadata.json", fixtureDirectory), metadata)
  ]);

  process.stdout.write(
    `Wrote live fixtures to tests/fixtures/fuelFinder/live (${stationSample.length} stations, ${priceSample.length} price records).\n`
  );
};

run().catch((error) => {
  const appError = toAppError(error);
  process.stderr.write(`${appError.message}\n`);
  process.exitCode = appError.exitCode;
});
