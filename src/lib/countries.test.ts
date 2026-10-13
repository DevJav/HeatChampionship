import { describe, expect, it } from "vitest";
import { countryName, countryOptions } from "./countries";

describe("countries", () => {
  it("names countries in Spanish", () => {
    expect(countryName("IT")).toBe("Italia");
    expect(countryName("GB")).toBe("Reino Unido");
    expect(countryName("US")).toBe("Estados Unidos");
    expect(countryName("GB-SCT")).toBe("Escocia");
  });

  it("returns null for unknown or missing codes", () => {
    expect(countryName("ZZ")).toBeNull();
    expect(countryName("BQ-BO")).toBeNull();
    expect(countryName(null)).toBeNull();
  });

  it("lists countries sorted by Spanish name", () => {
    const options = countryOptions();
    expect(options.length).toBeGreaterThan(200);
    const labels = options.map((o) => o.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "es-ES")));
    expect(options).toContainEqual({ value: "ES", label: "España" });
  });
});
