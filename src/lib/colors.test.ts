import { describe, expect, it } from "vitest";
import { accentTokens, luminance, needsOutline, readableTextOn } from "./colors";

describe("readableTextOn", () => {
  it("uses dark text on light car colors", () => {
    expect(readableTextOn("#f5f5f4")).toBe("#111214"); // Blanco
    expect(readableTextOn("#facc15")).toBe("#111214"); // Amarillo
  });

  it("uses white text on dark car colors", () => {
    expect(readableTextOn("#1c1917")).toBe("#ffffff"); // Negro
    expect(readableTextOn("#d10500")).toBe("#ffffff"); // Rojo
    expect(readableTextOn("#1d4ed8")).toBe("#ffffff"); // Azul
  });
});

describe("luminance", () => {
  it("spans black to white", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("not a color")).toBe(0);
  });
});

describe("needsOutline", () => {
  it("flags only very light colors", () => {
    expect(needsOutline("#f5f5f4")).toBe(true);
    expect(needsOutline("#facc15")).toBe(false);
  });
});

describe("accentTokens", () => {
  const ratio = (a: string, b: string) => {
    const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };

  it("uses a readable car color as is", () => {
    const tokens = accentTokens("#1d4ed8");
    expect(tokens["--primary"]).toBe("#1d4ed8");
    expect(tokens["--primary-ink"]).toBe("#1d4ed8");
    expect(tokens["--primary-fg"]).toBe("#ffffff");
  });

  it("keeps yellow bright for fills and uses ink for text", () => {
    const tokens = accentTokens("#facc15");
    expect(tokens["--primary"]).toBe("#facc15");
    expect(tokens["--primary-fg"]).toBe("#111214");
    expect(tokens["--primary-ink"]).toBe("#111214");
  });

  it("greys white so it shows on the light panels", () => {
    const fill = accentTokens("#f5f5f4")["--primary"];
    expect(ratio(fill, "#f8f8f9")).toBeGreaterThanOrEqual(1.3);
  });

  it("lifts black so it shows on the dark bars", () => {
    const tokens = accentTokens("#1c1917");
    expect(ratio(tokens["--primary"], "#111214")).toBeGreaterThanOrEqual(2.2);
    expect(tokens["--primary-ink"]).toBe("#1c1917");
  });

  it("ignores invalid colors", () => {
    expect(accentTokens("red")).toEqual({});
  });
});
