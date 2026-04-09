import { afterEach, describe, expect, it, vi } from "vitest";

import { createFuelFinderClient } from "../../src/providers/fuelFinderClient.js";

import pricesEmptyPage from "../fixtures/fuelFinder/pricesEmptyPage.json" with { type: "json" };
import pricesPage1 from "../fixtures/fuelFinder/pricesPage1.json" with { type: "json" };
import stationsEmptyPage from "../fixtures/fuelFinder/stationsEmptyPage.json" with { type: "json" };
import stationsPage1 from "../fixtures/fuelFinder/stationsPage1.json" with { type: "json" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createFuelFinderClient", () => {
  it("fetches token once and pages through stations and prices", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              access_token: "token-1",
              expires_in: 3600,
              token_type: "Bearer"
            },
            success: true
          }),
          {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(stationsPage1), {
          headers: {
            "content-type": "application/json"
          },
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(stationsEmptyPage), {
          headers: {
            "content-type": "application/json"
          },
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(pricesPage1), {
          headers: {
            "content-type": "application/json"
          },
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(pricesEmptyPage), {
          headers: {
            "content-type": "application/json"
          },
          status: 200
        })
      );

    const client = createFuelFinderClient({
      cacheDir: "/tmp/fuel-cli",
      fuelFinderBaseUrl: "https://www.fuel-finder.service.gov.uk",
      fuelFinderClientId: "client-id",
      fuelFinderClientSecret: "client-secret"
    });
    const stations = await client.getAllStations();
    const prices = await client.getAllFuelPrices();

    expect(stations).toHaveLength(2);
    expect(prices).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(5);
    expect(fetchSpy.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        accept: "application/json",
        authorization: "Bearer token-1"
      }
    });
    expect(fetchSpy.mock.calls[3]?.[1]).toMatchObject({
      headers: {
        accept: "application/json",
        authorization: "Bearer token-1"
      }
    });
  });

  it("treats not found after prior pages as the end of pagination", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              access_token: "token-1",
              expires_in: 3600,
              token_type: "Bearer"
            },
            success: true
          }),
          {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(stationsPage1), {
          headers: {
            "content-type": "application/json"
          },
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "not found"
          }),
          {
            headers: {
              "content-type": "application/json"
            },
            status: 404
          }
        )
      );

    const client = createFuelFinderClient({
      cacheDir: "/tmp/fuel-cli",
      fuelFinderBaseUrl: "https://www.fuel-finder.service.gov.uk",
      fuelFinderClientId: "client-id",
      fuelFinderClientSecret: "client-secret"
    });
    const stations = await client.getAllStations();

    expect(stations).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("requires credentials before fetching", async () => {
    const client = createFuelFinderClient({
      cacheDir: "/tmp/fuel-cli",
      fuelFinderBaseUrl: "https://www.fuel-finder.service.gov.uk"
    });

    await expect(client.getAllStations()).rejects.toMatchObject({
      code: "AUTH_ERROR"
    });
  });

  it("surfaces a credential hint when the token request is unauthorized", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Unauthorized"
        }),
        {
          headers: {
            "content-type": "application/json"
          },
          status: 401
        }
      )
    );
    const client = createFuelFinderClient({
      cacheDir: "/tmp/fuel-cli",
      fuelFinderBaseUrl: "https://www.fuel-finder.service.gov.uk",
      fuelFinderClientId: "client-id",
      fuelFinderClientSecret: "client-secret"
    });

    await expect(client.getAllStations()).rejects.toMatchObject({
      code: "AUTH_ERROR",
      message: expect.stringContaining("Check FUEL_FINDER_CLIENT_ID and FUEL_FINDER_CLIENT_SECRET")
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
