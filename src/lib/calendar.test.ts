import { describe, expect, it } from "vitest";
import { googleCalendarUrl, icsCalendar, type CalendarEvent } from "./calendar";

const event: CalendarEvent = {
  uid: "race-1@heat",
  updatedAt: new Date("2026-10-13T10:00:00Z"),
  title: "Heat · Ronda 3 · Francia",
  start: new Date("2026-11-14T17:00:00Z"),
  end: new Date("2026-11-14T20:00:00Z"),
  location: "Casa de Ana, 2º B",
  description: "Traed algo de picar; se juega con clima.\nNos vemos",
  url: "https://heat.example.com/carreras/1",
};

describe("icsCalendar", () => {
  const ics = icsCalendar(event);

  it("writes UTC times and CRLF line endings", () => {
    expect(ics).toContain("DTSTART:20261114T170000Z\r\n");
    expect(ics).toContain("DTEND:20261114T200000Z\r\n");
    expect(ics).toContain("DTSTAMP:20261013T100000Z\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes commas, semicolons and newlines in text", () => {
    expect(ics).toContain("LOCATION:Casa de Ana\\, 2º B");
    expect(ics).toContain("DESCRIPTION:Traed algo de picar\; se juega con clima.\\nNos vemos");
  });

  it("folds lines longer than 75 bytes", () => {
    const long = icsCalendar({ ...event, description: "ñ".repeat(100) });
    for (const line of long.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(long).toContain("\r\n ");
  });
});

describe("googleCalendarUrl", () => {
  it("builds a template link with dates, place and details", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe("20261114T170000Z/20261114T200000Z");
    expect(url.searchParams.get("location")).toBe("Casa de Ana, 2º B");
    expect(url.searchParams.get("details")).toContain("https://heat.example.com/carreras/1");
  });
});
