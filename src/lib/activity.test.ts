import { describe, expect, it } from "vitest";
import { describeActivity, type ActivityRecord } from "./activity";

const race = { id: "r1", round: 3, scheduledAt: new Date("2026-11-14T17:00:00Z"), track: { name: "Italia" }, winner: null };
const season = { id: "s1", name: "Temporada 2026/27", champion: null };
const base: ActivityRecord = { type: "RACE_SIGNUP", actor: { name: "Ana", username: "ana" }, race, season: null };

describe("describeActivity", () => {
  it("puts the driver first for their own moves", () => {
    expect(describeActivity(base)).toEqual({ subject: "Ana", text: "se ha apuntado a Ronda 3 · Italia", href: "/carreras/r1" });
    expect(describeActivity({ ...base, type: "RACE_WITHDRAWAL" }).text).toBe("se ha retirado de Ronda 3 · Italia");
    expect(describeActivity({ ...base, type: "PHOTOS_ADDED" }).href).toBe("/carreras/r1#fotos");
  });

  it("announces the Driver of the Day", () => {
    expect(describeActivity({ ...base, type: "DRIVER_OF_THE_DAY" })).toEqual({
      subject: "Ana",
      text: "es el piloto del día de Ronda 3 · Italia",
      href: "/carreras/r1",
    });
  });

  it("links new drivers to their profile", () => {
    expect(describeActivity({ ...base, type: "PLAYER_JOINED", race: null })).toEqual({
      subject: "Ana",
      text: "se ha unido al campeonato",
      href: "/pilotos/ana",
    });
  });

  it("describes race announcements without a driver", () => {
    const announced = describeActivity({ ...base, type: "RACE_ANNOUNCED", actor: null });
    expect(announced.subject).toBeNull();
    expect(announced.text).toBe("Nueva carrera en el calendario: Ronda 3 · Italia (14 nov)");
    expect(describeActivity({ ...base, type: "SIGNUPS_OPENED", actor: null }).text).toBe(
      "Inscripciones abiertas para Ronda 3 · Italia",
    );
  });

  it("names the winner and the champion when known", () => {
    const results = { ...base, type: "RESULTS_PUBLISHED", actor: null } as const;
    expect(describeActivity(results).text).toBe("Ya están los resultados de Ronda 3 · Italia");
    expect(describeActivity({ ...results, race: { ...race, winner: "Marco" } }).text).toBe(
      "Ya están los resultados de Ronda 3 · Italia: victoria de Marco",
    );

    const finished = { type: "SEASON_FINISHED", actor: null, race: null, season } as const;
    expect(describeActivity(finished)).toEqual({
      subject: null,
      text: "Termina Temporada 2026/27",
      href: "/clasificacion?temporada=s1",
    });
    expect(describeActivity({ ...finished, season: { ...season, champion: "Lucía" } }).text).toBe(
      "Termina Temporada 2026/27: el título es para Lucía",
    );
  });
});
