import { describe, expect, it } from "vitest";
import { raceCalendarEvent, raceShareText, whatsappUrl } from "./race-share";

const race = {
  id: "abc",
  updatedAt: new Date("2026-10-01T10:00:00Z"),
  round: 3,
  status: "OPEN" as const,
  scheduledAt: new Date("2026-11-14T17:00:00Z"),
  signupDeadline: null,
  location: "Casa de Ana",
  notes: "Traed algo de picar.",
  maxPlayers: 6,
  track: { name: "Francia" },
  season: { name: "Temporada 2026/27" },
};
const url = "https://heat.example.com/carreras/abc";
const before = new Date("2026-11-01T10:00:00Z");

describe("raceShareText", () => {
  it("invites to an open race with date, place and seats", () => {
    expect(raceShareText(race, url, { confirmed: 4, podium: [] }, before)).toBe(
      [
        "🏁 Ronda 3 · Francia (Temporada 2026/27)",
        "📅 sábado, 14 de noviembre, 18:00",
        "📍 Casa de Ana",
        "🏎️ 4/6 plazas — ¡apúntate!",
        url,
      ].join("\n"),
    );
  });

  it("mentions the waitlist when the race is full", () => {
    expect(raceShareText(race, url, { confirmed: 6, podium: [] }, before)).toContain("🏎️ 6/6 plazas — apúntate a la lista de espera");
  });

  it("announces the podium of a finished race", () => {
    const text = raceShareText({ ...race, status: "FINISHED" }, url, { confirmed: 6, podium: ["Ana", "Marco", "Lucía"] });
    expect(text).toBe(`🏆 Ronda 3 · Francia (Temporada 2026/27): ganó Ana (2º Marco, 3º Lucía).\nResultados: ${url}`);
  });

  it("encodes the message for WhatsApp", () => {
    expect(whatsappUrl("a b\n¡c!")).toBe("https://wa.me/?text=a%20b%0A%C2%A1c!");
  });
});

describe("raceCalendarEvent", () => {
  it("lasts the configured race night and links back", () => {
    const event = raceCalendarEvent(race, url);
    expect(event.end.getTime() - event.start.getTime()).toBe(3 * 3_600_000);
    expect(event.title).toBe("Heat · Ronda 3 · Francia");
    expect(event.url).toBe(url);
  });
});
