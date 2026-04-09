import { describe, expect, it } from "vitest";

import { parseLocationInput } from "../../src/lib/location.js";

describe("parseLocationInput", () => {
  it("parses postcodes", () => {
    expect(parseLocationInput("se19sg")).toStrictEqual({
      kind: "postcode",
      postcode: "SE1 9SG"
    });
  });

  it("parses coordinates", () => {
    expect(parseLocationInput("51.501,-0.141")).toStrictEqual({
      coordinates: {
        latitude: 51.501,
        longitude: -0.141
      },
      kind: "coordinates"
    });
  });

  it("rejects unsupported free text", () => {
    expect(() => parseLocationInput("Leeds")).toThrow('Expected a UK postcode like "SE1 9SG"');
  });
});
