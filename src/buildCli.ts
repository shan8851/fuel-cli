import { createRequire } from "node:module";

import { Command } from "commander";

import { registerListCommand } from "./commands/listCommand.js";
import { registerNearCommand } from "./commands/nearCommand.js";
import { registerStationCommand } from "./commands/stationCommand.js";
import { loadConfig } from "./lib/config.js";
import { createDatasetStore } from "./lib/datasetStore.js";
import { createFuelService } from "./lib/fuelService.js";
import { createFuelFinderClient } from "./providers/fuelFinderClient.js";
import { createPostcodesClient } from "./providers/postcodesClient.js";

import type { FuelService } from "./lib/types.js";

export type CliDependencies = {
  fuelService: FuelService;
};

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };
const TOP_LEVEL_HELP_EXAMPLES = [
  "fuel --list commute",
  "fuel list commute",
  'fuel near "SE1 9SG" --fuel E10',
  'fuel near "51.501,-0.141" --fuel B7_STANDARD --radius 8mi',
  'fuel station "tesco watford"',
  'fuel station "<node-id>" --json --output station.prices.0.pencePerLitre'
].join("\n  ");

export const buildCli = (dependencies?: Partial<CliDependencies>): Command => {
  const config = loadConfig();
  const fuelService =
    dependencies?.fuelService ??
    createFuelService(
      createDatasetStore(config.cacheDir, createFuelFinderClient(config)),
      createPostcodesClient()
    );
  const program = new Command();

  program
    .name("fuel")
    .description("UK fuel prices in your terminal. Built for AI agents, still useful for humans.")
    .option("--no-color", "Disable ANSI colours in text output")
    .showHelpAfterError()
    .showSuggestionAfterError()
    .version(packageJson.version);

  registerNearCommand(program, fuelService);
  registerStationCommand(program, fuelService);
  registerListCommand(program, fuelService);

  program.addHelpText(
    "after",
    `\nOutput defaults to text in a TTY and JSON when piped. Use --json or --text to override.\n\nExamples:\n  ${TOP_LEVEL_HELP_EXAMPLES}`
  );

  return program;
};
