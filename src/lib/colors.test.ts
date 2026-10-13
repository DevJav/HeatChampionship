import { describe, expect, it } from "vitest";
import { luminance, needsOutline, readableTextOn } from "./colors";

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
