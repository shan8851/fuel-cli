import { describe, expect, it, vi } from "vitest";

import { handleCliRuntimeError } from "../../src/lib/cliRuntime.js";
import { createAppError } from "../../src/lib/errors.js";

describe("handleCliRuntimeError", () => {
  it("prints structured json for parser-time app errors when --json is present", () => {
    const stdoutChunks: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
    const previousExitCode = process.exitCode;

    process.exitCode = undefined;

    try {
      handleCliRuntimeError(
        createAppError("INVALID_INPUT", "Expected --limit to be a positive integer no greater than 50."),
        ["near", "SE1 9SG", "--fuel", "E10", "--limit", "999", "--json"]
      );

      expect(process.exitCode).toBe(2);
      expect(JSON.parse(stdoutChunks.join(""))).toMatchObject({
        command: "near",
        error: {
          code: "INVALID_INPUT",
          message: "Expected --limit to be a positive integer no greater than 50."
        },
        ok: false
      });
    } finally {
      process.exitCode = previousExitCode;
      stdoutSpy.mockRestore();
    }
  });
});
