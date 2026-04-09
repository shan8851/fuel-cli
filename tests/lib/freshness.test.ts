import { describe, expect, it } from "vitest";

import { computeFreshness } from "../../src/lib/freshness.js";

describe("computeFreshness", () => {
  it("marks fresh updates", () => {
    const referenceTime = new Date("2026-04-09T10:10:00.000Z");

    expect(computeFreshness("2026-04-09T10:00:00.000Z", referenceTime)).toStrictEqual({
      freshnessBand: "fresh",
      freshnessMinutes: 10
    });
  });

  it("marks aging updates", () => {
    const referenceTime = new Date("2026-04-09T13:00:00.000Z");

    expect(computeFreshness("2026-04-09T10:00:00.000Z", referenceTime)).toStrictEqual({
      freshnessBand: "aging",
      freshnessMinutes: 180
    });
  });

  it("marks stale updates", () => {
    const referenceTime = new Date("2026-04-09T15:30:00.000Z");

    expect(computeFreshness("2026-04-09T10:00:00.000Z", referenceTime)).toStrictEqual({
      freshnessBand: "stale",
      freshnessMinutes: 330
    });
  });

  it("marks unknown updates", () => {
    expect(computeFreshness(null)).toStrictEqual({
      freshnessBand: "unknown",
      freshnessMinutes: null
    });
  });
});
