import { config as loadDotEnv } from "dotenv";
import { homedir } from "node:os";
import { join } from "node:path";

import type { AppConfig } from "./types.js";

const firstDefinedValue = (values: Array<string | undefined>): string | undefined =>
  values.map((value) => value?.trim()).find((value) => Boolean(value));

const getDefaultCacheDir = (): string => {
  const xdgCacheHome = process.env["XDG_CACHE_HOME"]?.trim();

  if (xdgCacheHome) {
    return join(xdgCacheHome, "fuel-cli");
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Caches", "fuel-cli");
  }

  if (process.platform === "win32") {
    const localAppData = process.env["LOCALAPPDATA"]?.trim();
    return localAppData ? join(localAppData, "fuel-cli") : join(homedir(), "AppData", "Local", "fuel-cli");
  }

  return join(homedir(), ".cache", "fuel-cli");
};

export const loadConfig = (): AppConfig => {
  loadDotEnv({
    quiet: true
  });

  const fuelFinderBaseUrl = firstDefinedValue([process.env["FUEL_FINDER_BASE_URL"]]) ?? "https://www.fuel-finder.service.gov.uk";
  const fuelFinderClientId = firstDefinedValue([process.env["FUEL_FINDER_CLIENT_ID"]]);
  const fuelFinderClientSecret = firstDefinedValue([process.env["FUEL_FINDER_CLIENT_SECRET"]]);
  const cacheDir = firstDefinedValue([process.env["FUEL_CACHE_DIR"]]) ?? getDefaultCacheDir();

  return {
    cacheDir,
    fuelFinderBaseUrl,
    ...(fuelFinderClientId ? { fuelFinderClientId } : {}),
    ...(fuelFinderClientSecret ? { fuelFinderClientSecret } : {})
  };
};
