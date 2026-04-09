import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createDatasetStore } from "../../src/lib/datasetStore.js";

import pricesPage1 from "../fixtures/fuelFinder/pricesPage1.json" with { type: "json" };
import stationsPage1 from "../fixtures/fuelFinder/stationsPage1.json" with { type: "json" };

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      rm(directory, {
        force: true,
        recursive: true
      })
    )
  );
});

describe("createDatasetStore", () => {
  it("falls back to cached data when refresh fails", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "fuel-cli-test-"));
    tempDirectories.push(cacheDir);
    const workingClient = {
      getAllFuelPrices: vi.fn(async () => pricesPage1.data),
      getAllStations: vi.fn(async () => stationsPage1.data)
    };
    const failingClient = {
      getAllFuelPrices: vi.fn(async () => {
        throw new Error("no network");
      }),
      getAllStations: vi.fn(async () => {
        throw new Error("no network");
      })
    };
    const warmStore = createDatasetStore(cacheDir, workingClient);
    const staleStore = createDatasetStore(cacheDir, failingClient);

    await warmStore.getDataset();
    const result = await staleStore.getDataset({
      refresh: true
    });

    expect(result.stations).toHaveLength(2);
    expect(failingClient.getAllStations).toHaveBeenCalled();
  });

  it("rebuilds legacy indexes that do not contain quality flags", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "fuel-cli-test-"));
    tempDirectories.push(cacheDir);
    const client = {
      getAllFuelPrices: vi.fn(async () => pricesPage1.data),
      getAllStations: vi.fn(async () => stationsPage1.data)
    };
    const store = createDatasetStore(cacheDir, client);

    await store.getDataset();

    const indexPath = join(cacheDir, "index.json");
    const legacyIndex = JSON.parse(await readFile(indexPath, "utf8")) as {
      builtAt: string;
      data: Array<Record<string, unknown>>;
      priceSourceCachedAt: string;
      stationSourceCachedAt: string;
    };
    const downgradedIndex = {
      ...legacyIndex,
      data: legacyIndex.data.map(({ qualityFlags: _qualityFlags, ...station }) => station)
    };

    await writeFile(indexPath, JSON.stringify(downgradedIndex, null, 2));

    const result = await store.getDataset();

    expect(result.stations[0]?.qualityFlags).toEqual([]);
    expect(client.getAllStations).toHaveBeenCalledTimes(1);
    expect(client.getAllFuelPrices).toHaveBeenCalledTimes(1);
  });
});
