import { describe, expect, it } from "vitest";
import { cleanRadio, RADIO_MAX, RadioError } from "./radio";

describe("cleanRadio", () => {
  it("trims and collapses spaces, and clears when empty", () => {
    expect(cleanRadio("  The  cards\\njust didn't come  ".replace("\\n", "\n"), "x")).toBe("The cards just didn't come");
    expect(cleanRadio("   ", "x")).toBeNull();
  });

  it("refuses lines over the limit", () => {
    expect(() => cleanRadio("a".repeat(RADIO_MAX + 1), "too long")).toThrow(RadioError);
    expect(cleanRadio("a".repeat(RADIO_MAX), "x")).toHaveLength(RADIO_MAX);
  });
});
