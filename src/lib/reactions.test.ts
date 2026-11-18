import { describe, expect, it } from "vitest";
import { DEFAULT_REACTIONS, groupReactions, isEmoji, parseReaction } from "./reactions";

describe("isEmoji", () => {
  it("accepts single emoji, flags, skin tones, keycaps and ZWJ sequences", () => {
    for (const e of [...DEFAULT_REACTIONS, "🇫🇷", "👍🏽", "1️⃣", "👨‍👩‍👧", "🏎️", "☠️"]) expect(isEmoji(e), e).toBe(true);
  });
  it("rejects text, several emoji and empty strings", () => {
    for (const e of ["", "a", "1", "🔥🔥", "ok👍", "!", " ", "<script>"]) expect(isEmoji(e), e).toBe(false);
  });
});

describe("parseReaction", () => {
  it("takes the first emoji from what was typed", () => {
    expect(parseReaction("  🔥 ")).toBe("🔥");
    expect(parseReaction("wow 🇬🇧🏁")).toBe("🇬🇧");
    expect(parseReaction("hello")).toBeNull();
    expect(parseReaction("")).toBeNull();
  });
});

describe("groupReactions", () => {
  it("groups by emoji in first-use order and marks mine", () => {
    const rows = [
      { emoji: "🔥", user: { id: "a", name: "Ana" } },
      { emoji: "😂", user: { id: "b", name: "Bea" } },
      { emoji: "🔥", user: { id: "b", name: "Bea" } },
    ];
    expect(groupReactions(rows, "b")).toEqual([
      { emoji: "🔥", count: 2, mine: true, names: ["Ana", "Bea"] },
      { emoji: "😂", count: 1, mine: true, names: ["Bea"] },
    ]);
    expect(groupReactions(rows, "a")[1].mine).toBe(false);
  });
});
