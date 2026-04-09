import { describe, expect, it } from "vitest";

import { parseLimit } from "../../src/lib/commandUtils.js";

describe("parseLimit", () => {
  it("accepts positive integers up to the maximum", () => {
    expect(parseLimit("50")).toBe(50);
  });

  it("rejects values above the documented maximum", () => {
    expect(() => parseLimit("999")).toThrow("Expected --limit to be a positive integer no greater than 50.");
  });
});
