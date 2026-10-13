import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { OgFrame, OgTag, flagDataUri } from "@/components/og/OgFrame";
import { getRace } from "@/lib/data/races";
import { getRaceResults } from "@/lib/data/results";
import { formatRaceDay } from "@/lib/format";
import { OG_SIZE, ogFonts } from "@/lib/og-fonts";
import { racePhase } from "@/lib/registration-rules";

export const alt = "Carrera del campeonato Heat";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Link preview for a race: track, date, place and sign-ups or the winner. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const race = await getRace(id);
  const fonts = await ogFonts();

  if (!race) {
    return new ImageResponse(
      <OgFrame>
        <div style={{ display: "flex", fontSize: 110, fontWeight: 700, fontStyle: "italic", color: "#fff" }}>
          {siteConfig.name}
        </div>
      </OgFrame>,
      { ...size, fonts },
    );
  }

  const phase = racePhase(race);
  const confirmed = race.registrations.filter((r) => r.status === "CONFIRMED").length;
  const winner =
    phase === "FINISHED" ? (await getRaceResults(race.id)).find((r) => r.position === 1)?.user.name : undefined;

  const status =
    phase === "FINISHED" ? (
      <OgTag background="#d4a017" color="#2a1f00">
        {winner ? `🏆 Ganó ${winner}` : "Finalizada"}
      </OgTag>
    ) : phase === "OPEN" ? (
      <OgTag background="#15803d">
        {confirmed >= race.maxPlayers ? "Completa · lista de espera" : `Inscripción abierta · ${confirmed}/${race.maxPlayers}`}
      </OgTag>
    ) : phase === "CLOSED" ? (
      <OgTag background="#b45309">Inscripción cerrada</OgTag>
    ) : (
      <OgTag background="#2563eb">En marcha</OgTag>
    );

  return new ImageResponse(
    (
      <OgFrame flag={flagDataUri(race.track.countryCode)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <OgTag>Ronda {race.round}</OgTag>
            <OgTag background="#000">{race.season.name}</OgTag>
          </div>
          <div style={{ display: "flex", fontSize: 140, fontWeight: 700, fontStyle: "italic", textTransform: "uppercase", color: "#fff", lineHeight: 0.95 }}>
            {race.track.name}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.85)" }}>
            {formatRaceDay(race.scheduledAt)}
            {race.location ? ` · ${race.location}` : ""}
          </div>
          <div style={{ display: "flex", marginTop: 6 }}>{status}</div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
