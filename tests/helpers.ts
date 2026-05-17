import { beforeEach, vi } from "vitest";

import { buildCli } from "../src/buildCli.js";
import { handleCliRuntimeError } from "../src/lib/cliRuntime.js";

import type { CliDependencies } from "../src/buildCli.js";
import type { FuelService, NearCommandData, StationCommandData } from "../src/lib/types.js";

const ESCAPE_CHARACTER = String.fromCharCode(27);
const ANSI_PATTERN = new RegExp(`${ESCAPE_CHARACTER}\\[[0-9;]*m`, "g");

const notImplemented = (label: string): never => {
  throw new Error(`${label} was not stubbed for this test.`);
};

export const createStubFuelService = (overrides: Partial<FuelService> = {}): FuelService => ({
  findStation: vi.fn(async () => notImplemented("findStation")),
  findStationList: vi.fn(async () => notImplemented("findStationList")),
  findStationsNear: vi.fn(async () => notImplemented("findStationsNear")),
  ...overrides
});

type CliEnvironment = {
  env?: Record<string, string | undefined>;
  isTTY?: boolean;
};

export const runCli = async (
  args: string[],
  dependencies?: Partial<CliDependencies>,
  environment: CliEnvironment = {}
): Promise<{ exitCode: number; stderr: string; stdout: string }> => {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    stdoutChunks.push(String(chunk));
    return true;
  });
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderrChunks.push(String(chunk));
    return true;
  });
  const previousEnvironment = Object.fromEntries(
    Object.keys(environment.env ?? {}).map((key) => [key, process.env[key]])
  );
  const previousExitCode = process.exitCode;
  const previousIsTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");

  process.exitCode = undefined;
  Object.entries(environment.env ?? {}).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }

    process.env[key] = value;
  });

  if (environment.isTTY !== undefined) {
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: environment.isTTY
    });
  }

  try {
    const cli = buildCli(dependencies);
    cli.exitOverride();

    try {
      await cli.parseAsync(args, {
        from: "user"
      });
    } catch (error) {
      if (!isCliExitError(error)) {
        handleCliRuntimeError(error, args);
      }
    }

    return {
      exitCode: process.exitCode ?? 0,
      stderr: stderrChunks.join(""),
      stdout: stdoutChunks.join("")
    };
  } finally {
    process.exitCode = previousExitCode;
    Object.entries(previousEnvironment).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
        return;
      }

      process.env[key] = value;
    });
    if (previousIsTTYDescriptor) {
      Object.defineProperty(process.stdout, "isTTY", previousIsTTYDescriptor);
    } else {
      delete (process.stdout as Partial<typeof process.stdout> & { isTTY?: boolean }).isTTY;
    }
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  }
};

export const stripAnsi = (value: string): string => value.replaceAll(ANSI_PATTERN, "");

export const sampleNearCommandData: NearCommandData = {
  input: {
    fuelType: "E10",
    limit: 10,
    location: "SE1 9SG",
    radiusMiles: 5,
    refresh: false,
    sort: "best"
  },
  quality: {
    advisories: [],
    excludedLikelyTestStations: 0,
    freshnessCounts: {
      aging: 0,
      fresh: 1,
      stale: 0,
      unknown: 0
    }
  },
  resolvedLocation: {
    displayValue: "SE1 9SG",
    kind: "postcode",
    latitude: 51.4989,
    longitude: -0.1113,
    postcode: "SE1 9SG"
  },
  stations: [
    {
      addressLine1: "1 River Road",
      addressLine2: null,
      amenities: ["customer_toilets"],
      availableFuelTypes: ["E10", "E5"],
      brandName: "Tesco",
      city: "London",
      country: "England",
      county: null,
      distanceMiles: 0.12,
      freshnessBand: "fresh",
      freshnessMinutes: 8,
      isMotorwayServiceStation: false,
      isSupermarketServiceStation: true,
      lastUpdatedAt: "2026-04-09T10:00:00.000Z",
      nodeId: "node-1",
      postcode: "SE1 9SG",
      qualityFlags: [],
      selectedFuelType: "E10",
      selectedPricePencePerLitre: 132.9,
      tradingName: "Tesco Riverside"
    }
  ]
};

export const sampleStationCommandData: StationCommandData = {
  input: {
    query: "node-1",
    refresh: false
  },
  quality: {
    advisories: []
  },
  station: {
    amenities: ["customer_toilets", "water_filling"],
    availableFuelTypes: ["E10", "E5"],
    brandName: "Tesco",
    isMotorwayServiceStation: false,
    isSupermarketServiceStation: true,
    lastUpdatedAt: "2026-04-09T10:00:00.000Z",
    location: {
      addressLine1: "1 River Road",
      addressLine2: null,
      city: "London",
      country: "England",
      county: null,
      latitude: 51.4989,
      longitude: -0.1113,
      postcode: "SE1 9SG"
    },
    nodeId: "node-1",
    openingTimes: null,
    permanentClosure: false,
    permanentClosureDate: null,
    prices: [
      {
        effectiveAt: "2026-04-09T09:45:00.000Z",
        freshnessBand: "fresh",
        freshnessMinutes: 8,
        fuelType: "E10",
        lastUpdatedAt: "2026-04-09T10:00:00.000Z",
        pencePerLitre: 132.9
      }
    ],
    publicPhoneNumber: "+442071930000",
    qualityFlags: [],
    temporaryClosure: false,
    tradingName: "Tesco Riverside"
  }
};

export const resetTestState = (): void => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
};

const isCliExitError = (error: unknown): boolean =>
  error instanceof Error &&
  ("code" in error ||
    error.message.startsWith('process.exit unexpectedly called with "') ||
    error.message.includes("commander.helpDisplayed"));
