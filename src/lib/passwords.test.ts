import { describe, expect, it } from "vitest";
import { PASSWORD_MIN } from "./auth-rules";
import { temporaryPassword } from "./passwords";

describe("temporaryPassword", () => {
  it("joins two words and two digits", () => {
    const values = [1, 0, 7];
    expect(temporaryPassword(() => values.shift()!)).toBe("rebufo-curva-07");
  });

  it("is always long enough to be accepted", () => {
    for (let i = 0; i < 200; i++) expect(temporaryPassword().length).toBeGreaterThanOrEqual(PASSWORD_MIN);
  });
});
