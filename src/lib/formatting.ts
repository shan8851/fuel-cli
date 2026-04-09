import { hasStationQualityFlag } from "./dataQuality.js";

import type { NearCommandData, StationCommandData } from "./types.js";
import type { TextFormatterContext } from "./output.js";

const formatDistance = (distanceMiles: number): string => `${distanceMiles.toFixed(distanceMiles >= 10 ? 1 : 2)}mi`;

const formatFreshness = (
  freshnessBand: NearCommandData["stations"][number]["freshnessBand"],
  freshnessMinutes: number | null
): string => {
  if (freshnessBand === "unknown" || freshnessMinutes === null) {
    return "unknown";
  }

  if (freshnessBand === "fresh") {
    return `${freshnessMinutes}m`;
  }

  if (freshnessBand === "aging") {
    return `${freshnessMinutes}m aging`;
  }

  return `${freshnessMinutes}m stale`;
};

const formatAddress = (station: StationCommandData["station"]): string =>
  [
    station.location.addressLine1,
    station.location.addressLine2,
    station.location.city,
    station.location.county,
    station.location.postcode
  ]
    .filter((value) => Boolean(value))
    .join(", ");

const formatOpeningLine = (label: string, open: string | null, close: string | null, is24Hours: boolean): string => {
  if (is24Hours) {
    return `${label}: 24h`;
  }

  if (!open || !close) {
    return `${label}: unknown`;
  }

  return `${label}: ${open} - ${close}`;
};

const formatAdvisoryLines = (
  advisories: Array<{ message: string }>,
  context: TextFormatterContext
): string[] => advisories.map((advisory) => context.text.style.warning(`Warning: ${advisory.message}`));

export const formatNearText = (data: NearCommandData, context: TextFormatterContext): string => {
  const { style } = context.text;
  const bestStation = data.stations[0];

  if (!bestStation) {
    return "No stations found.";
  }

  const header = style.header(
    `Fuel near ${data.resolvedLocation.displayValue} (${data.input.fuelType}, ${data.input.radiusMiles}mi)`
  );
  const bestOverallLine = `Best overall: ${bestStation.tradingName} - ${bestStation.selectedPricePencePerLitre.toFixed(1)}p, ${formatDistance(bestStation.distanceMiles)}, ${formatFreshness(bestStation.freshnessBand, bestStation.freshnessMinutes)}`;
  const advisoryLines = formatAdvisoryLines(data.quality.advisories, context);
  const rows = data.stations.map((station) => {
    const left = `${station.tradingName}${station.brandName !== station.tradingName ? ` [${station.brandName}]` : ""}${hasStationQualityFlag(station.qualityFlags, "likely_test_station") ? ` ${style.warning("[likely test/demo]")}` : ""}`;
    const right = `${station.selectedPricePencePerLitre.toFixed(1)}p  ${formatDistance(station.distanceMiles)}  ${formatFreshness(
      station.freshnessBand,
      station.freshnessMinutes
    )}`;

    return context.text.joinAligned(left, right, context.terminalWidth);
  });

  return [header, bestOverallLine, ...(advisoryLines.length > 0 ? ["", ...advisoryLines] : []), "", ...rows].join("\n");
};

export const formatStationText = (data: StationCommandData, context: TextFormatterContext): string => {
  const { style } = context.text;
  const station = data.station;
  const advisoryLines = formatAdvisoryLines(data.quality.advisories, context);
  const priceLines = station.prices.map((price) =>
    context.text.joinAligned(
      `${price.fuelType}  ${formatFreshness(price.freshnessBand, price.freshnessMinutes)}`,
      `${price.pencePerLitre.toFixed(1)}p`,
      context.terminalWidth
    )
  );
  const openingLines = station.openingTimes
    ? [
        formatOpeningLine(
          "Mon",
          station.openingTimes.usualDays.monday?.open ?? null,
          station.openingTimes.usualDays.monday?.close ?? null,
          station.openingTimes.usualDays.monday?.is24Hours ?? false
        ),
        formatOpeningLine(
          "Tue",
          station.openingTimes.usualDays.tuesday?.open ?? null,
          station.openingTimes.usualDays.tuesday?.close ?? null,
          station.openingTimes.usualDays.tuesday?.is24Hours ?? false
        ),
        formatOpeningLine(
          "Wed",
          station.openingTimes.usualDays.wednesday?.open ?? null,
          station.openingTimes.usualDays.wednesday?.close ?? null,
          station.openingTimes.usualDays.wednesday?.is24Hours ?? false
        ),
        formatOpeningLine(
          "Thu",
          station.openingTimes.usualDays.thursday?.open ?? null,
          station.openingTimes.usualDays.thursday?.close ?? null,
          station.openingTimes.usualDays.thursday?.is24Hours ?? false
        ),
        formatOpeningLine(
          "Fri",
          station.openingTimes.usualDays.friday?.open ?? null,
          station.openingTimes.usualDays.friday?.close ?? null,
          station.openingTimes.usualDays.friday?.is24Hours ?? false
        ),
        formatOpeningLine(
          "Sat",
          station.openingTimes.usualDays.saturday?.open ?? null,
          station.openingTimes.usualDays.saturday?.close ?? null,
          station.openingTimes.usualDays.saturday?.is24Hours ?? false
        ),
        formatOpeningLine(
          "Sun",
          station.openingTimes.usualDays.sunday?.open ?? null,
          station.openingTimes.usualDays.sunday?.close ?? null,
          station.openingTimes.usualDays.sunday?.is24Hours ?? false
        )
      ]
    : ["Opening times: unknown"];
  const details = [
    style.header(station.tradingName),
    station.brandName !== station.tradingName ? `Brand: ${station.brandName}` : undefined,
    `Node ID: ${station.nodeId}`,
    `Address: ${formatAddress(station)}`,
    station.publicPhoneNumber ? `Phone: ${station.publicPhoneNumber}` : undefined,
    `Fuel types: ${station.availableFuelTypes.join(", ")}`,
    `Amenities: ${station.amenities.length > 0 ? station.amenities.join(", ") : "none listed"}`,
    station.temporaryClosure ? style.warning("Temporarily closed") : undefined,
    station.permanentClosure ? style.danger("Permanently closed") : undefined,
    ...advisoryLines,
    "",
    style.bold("Prices"),
    ...priceLines,
    "",
    style.bold("Opening hours"),
    ...openingLines
  ].filter((value): value is string => value !== undefined);

  return details.join("\n");
};
