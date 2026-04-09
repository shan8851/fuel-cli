import { afterEach, describe, expect, it, vi } from "vitest";

import { createPostcodesClient } from "../../src/providers/postcodesClient.js";

import postcodeFixture from "../fixtures/postcodes/se1.json" with { type: "json" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createPostcodesClient", () => {
  it("looks up a postcode through postcodes.io", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(postcodeFixture), {
        headers: {
          "content-type": "application/json"
        },
        status: 200
      })
    );
    const client = createPostcodesClient();
    const result = await client.lookupPostcode("SE1 9SG");

    expect(result).toStrictEqual(postcodeFixture.result);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        href: "https://api.postcodes.io/postcodes/SE1%209SG"
      }),
      expect.any(Object)
    );
  });

  it("returns a clearer not-found message for invalid postcodes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Invalid postcode",
          status: 404
        }),
        {
          headers: {
            "content-type": "application/json"
          },
          status: 404
        }
      )
    );
    const client = createPostcodesClient();

    await expect(client.lookupPostcode("BAD")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: 'Postcode lookup for "BAD": postcode not found. Upstream message: Invalid postcode'
    });
  });
});
