import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { OgFrame, OgTag, flagDataUri } from "@/components/og/OgFrame";
import { getRace } from "@/lib/data/races";
import { getRaceResults } from "@/lib/data/results";
import { formatRaceDay } from "@/lib/format";
import { OG_SIZE, ogFonts } from "@/lib/og-fonts";
import { racePhase } from "@/lib/registration-rules";
import { t } from "@/i18n";

export const alt = t.og.raceAlt;
export const size = OG_SIZE;
export const contentType = "image/png";

const PODIUM = ["#d4a017", "#b8bcc4", "#b06a2c"];
const MAX_CHIPS = 8;

/** A driver as a broadcast chip: optional place, colour stripe, name. */
function DriverChip({ name, color, place }: { name: string; color: string | null; place?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.55)", padding: "6px 18px 6px 8px", height: 46 }}>
      {place && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 34, background: PODIUM[place - 1], color: place === 3 ? "#fff" : "#111", fontSize: 24, fontWeight: 700, fontStyle: "italic" }}>
          {place}
        </div>
      )}
      {/* Faint outline so dark car colours still show on the chip */}
      <div style={{ display: "flex", width: 8, height: 30, background: color ?? "#9ca3af", border: "1px solid rgba(255,255,255,0.45)", transform: "skewX(-12deg)" }} />
      <div style={{ display: "flex", fontSize: 26, fontWeight: 700, fontStyle: "italic", textTransform: "uppercase", color: "#fff" }}>{name}</div>
    </div>
  );
}

/** Link preview for a race: track, date, place, sign-ups or the winner, and the grid or the podium. */
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
  const results = phase === "FINISHED" ? await getRaceResults(race.id) : [];
  const winner = results.find((r) => r.position === 1)?.user.name;
  const chips =
    phase === "FINISHED"
      ? results.slice(0, 3).map((r) => ({ name: r.user.name, color: r.carColor?.hex ?? r.user.favoriteColor?.hex ?? null, place: r.position }))
      : race.registrations
          .filter((r) => r.status === "CONFIRMED")
          .map((r) => ({ name: r.user.name, color: r.user.favoriteColor?.hex ?? null, place: undefined }));
  const shown = chips.slice(0, MAX_CHIPS);

  const status =
    phase === "FINISHED" ? (
      <OgTag background="#d4a017" color="#2a1f00">
        {winner ? t.og.won(winner) : t.og.finished}
      </OgTag>
    ) : phase === "OPEN" ? (
      <OgTag background="#15803d">
        {confirmed >= race.maxPlayers ? t.og.fullWaitlist : t.og.signupOpen(confirmed, race.maxPlayers)}
      </OgTag>
    ) : phase === "UPCOMING" ? (
      <OgTag background="#475569">{t.og.upcoming}</OgTag>
    ) : phase === "CLOSED" ? (
      <OgTag background="#b45309">{t.og.closed}</OgTag>
    ) : (
      <OgTag background="#2563eb">{t.og.underway}</OgTag>
    );

  return new ImageResponse(
    (
      <OgFrame flag={flagDataUri(race.track.countryCode)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <OgTag>{t.common.round(race.round)}</OgTag>
            <OgTag background="#000">{race.season.name}</OgTag>
          </div>
          <div style={{ display: "flex", fontSize: shown.length ? 110 : 140, fontWeight: 700, fontStyle: "italic", textTransform: "uppercase", color: "#fff", lineHeight: 0.95 }}>
            {race.track.name}
          </div>
          {/* Date and status share a line so two rows of drivers still fit */}
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.85)" }}>
              {formatRaceDay(race.scheduledAt)}
              {race.location ? ` · ${race.location}` : ""}
            </div>
            {status}
          </div>
          {shown.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: 1040 }}>
              {shown.map((chip) => (
                <DriverChip key={chip.name} {...chip} />
              ))}
              {chips.length > shown.length && (
                <div style={{ display: "flex", alignItems: "center", fontSize: 26, color: "rgba(255,255,255,0.8)" }}>+{chips.length - shown.length}</div>
              )}
            </div>
          )}
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
