#!/usr/bin/env node

import { buildCli } from "./buildCli.js";
import { handleCliRuntimeError } from "./lib/cliRuntime.js";

void buildCli()
  .parseAsync(process.argv)
  .catch((error) => {
    handleCliRuntimeError(error, process.argv.slice(2));
  });
