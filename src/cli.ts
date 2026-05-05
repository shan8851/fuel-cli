#!/usr/bin/env node

import { buildCli } from "./buildCli.js";
import { handleCliRuntimeError } from "./lib/cliRuntime.js";

const normalizeLegacyListOption = (argv: string[]): string[] => {
  const listOptionIndex = argv.findIndex((argument) => argument === "--list");

  if (listOptionIndex === -1) {
    return argv;
  }

  const listName = argv[listOptionIndex + 1];

  if (!listName) {
    return argv;
  }

  const argumentsWithoutListOption = argv.filter((_, index) => index !== listOptionIndex && index !== listOptionIndex + 1);

  if (argumentsWithoutListOption.length > 0) {
    return argv;
  }

  return ["list", listName];
};

const cliArguments = normalizeLegacyListOption(process.argv.slice(2));

void buildCli()
  .parseAsync([process.argv[0] ?? "node", process.argv[1] ?? "fuel", ...cliArguments])
  .catch((error) => {
    handleCliRuntimeError(error, cliArguments);
  });
