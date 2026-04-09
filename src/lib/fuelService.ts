import { DEFAULT_LIMIT } from "./constants.js";
import { type DatasetStore } from "./datasetStore.js";
import { buildNearQualitySummary, buildStationQualitySummary, hasStationQualityFlag } from "./dataQuality.js";
import { haversineDistanceKm, kmToMiles, roundMiles } from "./distance.js";
import { createAmbiguousQueryError, createAppError } from "./errors.js";
import { computeFreshness } from "./freshness.js";
import { parseLocationInput } from "./location.js";
import { sortNearResults } from "./ranking.js";

import type {
  FuelPriceView,
  FuelService,
  IndexedStation,
  NearCommandData,
  NearStationResult,
  PostcodesClient,
  ResolvedLocation,
  StationCandidate,
  StationCommandData,
  StationDetail
} from "./types.js";

const createStationCandidate = (station: IndexedStation): StationCandidate => ({
  addressLine1: station.location.addressLine1,
  brandName: station.brandName,
  nodeId: station.nodeId,
  postcode: station.location.postcode,
  tradingName: station.tradingName
});

const toStationDetail = (station: IndexedStation): StationDetail => {
  const prices = Object.values(station.prices)
    .filter((price): price is NonNullable<typeof price> => price !== undefined)
    .sort((left, right) => left.pencePerLitre - right.pencePerLitre)
    .map<FuelPriceView>((price) => {
      const freshness = computeFreshness(price.lastUpdatedAt);

      return {
        ...price,
        freshnessBand: freshness.freshnessBand,
        freshnessMinutes: freshness.freshnessMinutes
      };
    });
  const latestPriceTimestamp = prices
    .map((price) => price.lastUpdatedAt)
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort()
    .at(-1) ?? null;

  return {
    amenities: station.amenities,
    availableFuelTypes: station.availableFuelTypes,
    brandName: station.brandName,
    isMotorwayServiceStation: station.isMotorwayServiceStation,
    isSupermarketServiceStation: station.isSupermarketServiceStation,
    lastUpdatedAt: latestPriceTimestamp,
    location: station.location,
    nodeId: station.nodeId,
    openingTimes: station.openingTimes,
    permanentClosure: station.permanentClosure,
    permanentClosureDate: station.permanentClosureDate,
    prices,
    publicPhoneNumber: station.publicPhoneNumber,
    qualityFlags: station.qualityFlags,
    temporaryClosure: station.temporaryClosure,
    tradingName: station.tradingName
  };
};

const toNearStationResult = (
  station: IndexedStation,
  fuelType: keyof IndexedStation["prices"],
  distanceMiles: number
): NearStationResult | undefined => {
  const selectedPrice = station.prices[fuelType];

  if (!selectedPrice) {
    return undefined;
  }

  const freshness = computeFreshness(selectedPrice.lastUpdatedAt);

  return {
    addressLine1: station.location.addressLine1,
    addressLine2: station.location.addressLine2,
    amenities: station.amenities,
    availableFuelTypes: station.availableFuelTypes,
    brandName: station.brandName,
    city: station.location.city,
    country: station.location.country,
    county: station.location.county,
    distanceMiles: roundMiles(distanceMiles),
    freshnessBand: freshness.freshnessBand,
    freshnessMinutes: freshness.freshnessMinutes,
    isMotorwayServiceStation: station.isMotorwayServiceStation,
    isSupermarketServiceStation: station.isSupermarketServiceStation,
    lastUpdatedAt: selectedPrice.lastUpdatedAt,
    nodeId: station.nodeId,
    postcode: station.location.postcode,
    qualityFlags: station.qualityFlags,
    selectedFuelType: selectedPrice.fuelType,
    selectedPricePencePerLitre: selectedPrice.pencePerLitre,
    tradingName: station.tradingName
  };
};

const isStationClosed = (station: IndexedStation): boolean => station.permanentClosure || station.temporaryClosure;

const isLikelyTestStation = (station: Pick<IndexedStation, "qualityFlags">): boolean =>
  hasStationQualityFlag(station.qualityFlags, "likely_test_station");

const resolveLocation = async (
  postcodesClient: PostcodesClient,
  locationInput: string
): Promise<ResolvedLocation> => {
  const parsedLocationInput = parseLocationInput(locationInput);

  if (parsedLocationInput.kind === "coordinates") {
    return {
      displayValue: `${parsedLocationInput.coordinates.latitude},${parsedLocationInput.coordinates.longitude}`,
      kind: "coordinates",
      latitude: parsedLocationInput.coordinates.latitude,
      longitude: parsedLocationInput.coordinates.longitude
    };
  }

  const postcodeLookup = await postcodesClient.lookupPostcode(parsedLocationInput.postcode);

  return {
    displayValue: postcodeLookup.postcode,
    kind: "postcode",
    latitude: postcodeLookup.latitude,
    longitude: postcodeLookup.longitude,
    postcode: postcodeLookup.postcode
  };
};

const getStationMatches = (stations: IndexedStation[], query: string): IndexedStation[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const exactIdMatch = stations.find((station) => station.nodeId.toLowerCase() === normalizedQuery);

  if (exactIdMatch) {
    return [exactIdMatch];
  }

  const exactFieldMatches = stations.filter((station) =>
    [
      station.tradingName,
      station.brandName,
      station.location.postcode,
      station.location.addressLine1
    ]
      .map((value) => value.toLowerCase())
      .includes(normalizedQuery)
  );

  if (exactFieldMatches.length > 0) {
    return exactFieldMatches;
  }

  return stations
    .filter((station) => station.searchText.includes(normalizedQuery))
    .sort((left, right) => left.tradingName.localeCompare(right.tradingName, "en-GB"));
};

export const createFuelService = (
  datasetStore: DatasetStore,
  postcodesClient: PostcodesClient
): FuelService => ({
  findStation: async (query, options): Promise<StationCommandData> => {
    if (query.trim().length === 0) {
      throw createAppError("INVALID_INPUT", "Expected station query to be a non-empty node ID or text search.");
    }

    const dataset = await datasetStore.getDataset({
      refresh: options.refresh
    });
    const matches = getStationMatches(dataset.stations, query);

    if (matches.length === 0) {
      throw createAppError("NOT_FOUND", `No station matched "${query}".`);
    }

    if (matches.length > 1) {
      throw createAmbiguousQueryError(
        query,
        matches.slice(0, DEFAULT_LIMIT).map((station) => createStationCandidate(station))
      );
    }

    const matchedStation = matches[0];

    if (!matchedStation) {
      throw createAppError("NOT_FOUND", `No station matched "${query}".`);
    }

    const station = toStationDetail(matchedStation);

    return {
      input: {
        query,
        refresh: options.refresh
      },
      quality: buildStationQualitySummary(station),
      station
    };
  },
  findStationsNear: async (location, options): Promise<NearCommandData> => {
    const resolvedLocation = await resolveLocation(postcodesClient, location);
    const dataset = await datasetStore.getDataset({
      refresh: options.refresh
    });
    const stationsWithinRadius = dataset.stations
      .filter((station: IndexedStation) => !isStationClosed(station))
      .map((station: IndexedStation) => {
        const distanceMiles = kmToMiles(
          haversineDistanceKm(resolvedLocation, {
            latitude: station.location.latitude,
            longitude: station.location.longitude
          })
        );

        return toNearStationResult(station, options.fuelType, distanceMiles);
      })
      .filter((station): station is NearStationResult => station !== undefined)
      .filter((station: NearStationResult) => station.distanceMiles <= options.radiusMiles);
    const nonTestStations = stationsWithinRadius.filter((station) => !isLikelyTestStation(station));
    const includedStations = nonTestStations.length > 0 ? nonTestStations : stationsWithinRadius;
    const excludedLikelyTestStations = nonTestStations.length > 0 ? stationsWithinRadius.length - nonTestStations.length : 0;
    const sortedStations = sortNearResults(includedStations, options.sort).slice(0, options.limit);

    if (sortedStations.length === 0) {
      throw createAppError(
        "NOT_FOUND",
        `No ${options.fuelType} stations were found within ${options.radiusMiles} miles of ${resolvedLocation.displayValue}.`
      );
    }

    return {
      input: {
        fuelType: options.fuelType,
        limit: options.limit,
        location,
        radiusMiles: options.radiusMiles,
        refresh: options.refresh,
        sort: options.sort
      },
      quality: buildNearQualitySummary(sortedStations, excludedLikelyTestStations),
      resolvedLocation,
      stations: sortedStations
    };
  }
});
