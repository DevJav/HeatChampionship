import { describe, expect, it } from "vitest";
import { italicCenterPad, italicCenterStyle } from "./italic-center";

describe("italicCenterPad", () => {
  it("pads numbers starting with a thin 1 the most", () => {
    expect(italicCenterPad("13")).toBeCloseTo(0.234);
    expect(italicCenterPad("15")).toBeCloseTo(0.275);
  });

  it("pads wide digits less", () => {
    expect(italicCenterPad("31")).toBeCloseTo(0.067);
    expect(italicCenterPad("4")).toBeCloseTo(0.082);
  });

  it("gives up on text that isn't a number", () => {
    expect(italicCenterPad("RET")).toBeNull();
    expect(italicCenterPad("3º")).toBeNull();
    expect(italicCenterPad("")).toBeNull();
  });
});

describe("italicCenterStyle", () => {
  it("sets the padding variable for numbers only", () => {
    expect(italicCenterStyle(13)).toEqual({ "--italic-pad": "0.234em" });
    expect(italicCenterStyle("RET")).toBeUndefined();
  });
});
