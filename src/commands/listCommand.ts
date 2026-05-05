import type { Command } from "commander";

import { loadStationListsConfig } from "../lib/listConfig.js";
import { formatStationListText } from "../lib/formatting.js";
import { createAppError } from "../lib/errors.js";
import { runCommand, withGlobalOutputOptions } from "../lib/output.js";

import { addOutputOptions } from "./shared.js";

import type { FuelService, OutputOptions } from "../lib/types.js";

type ListCommandOptions = OutputOptions & {
  refresh?: boolean;
};

export const registerListCommand = (program: Command, fuelService: FuelService): void => {
  const command = addOutputOptions(program.command("list <listName>"))
    .description("Inspect stations from a named list in ./config.json")
    .option("--refresh", "Refresh cached Fuel Finder data before querying")
    .showHelpAfterError()
    .addHelpText(
      "after",
      '\nExample config.json:\n  {\n    "commute": {\n      "fuel": "B7_STANDARD",\n      "stations": [\n        { "searchText": "TESCO WATFORD", "display": "Tesco", "sort": 1 },\n        { "searchText": "MFG BLUECOATS", "sort": 2 }\n      ]\n    }\n  }\n\nRows use optional numeric "sort" (lower first). Prices are coloured by rank: cheapest 20% green, dearest 40% red.\n\nExample:\n  fuel list commute'
    );

  command.action(async (listName: string, options: ListCommandOptions, commandInstance: Command) => {
    const outputOptions = withGlobalOutputOptions(commandInstance, options);

    await runCommand(
      "list",
      outputOptions,
      async () => {
        const config = await loadStationListsConfig();
        const listDefinition = config[listName];

        if (!listDefinition) {
          throw createAppError("NOT_FOUND", `List "${listName}" was not found in ./config.json.`);
        }

        return fuelService.findStationList(listName, {
          fuelType: listDefinition.fuel,
          queries: listDefinition.stations,
          refresh: options.refresh ?? false
        });
      },
      formatStationListText,
      {
        projectionExamples: ["input.fuelType", "stations.0.selectedPricePencePerLitre", "stations.0.display"]
      }
    );
  });
};
