import Link from "next/link";
import { Crown, Flag, Rocket, TrendingUp } from "lucide-react";
import type { RaceDetail } from "@/lib/data/races";
import { countryName } from "@/lib/countries";
import { getStatsData } from "@/lib/data/stats";
import { formatDate, formatDecimal, formatPercent } from "@/lib/format";
import { championshipRecords, entrantRecords, gridStats, raceHistory } from "@/lib/stats";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Section,
  StatCard,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";

const HISTORY_LIMIT = 6;

/** "Ana", "Ana y Marco", "Ana, Marco y Lucía", "Ana, Marco, Lucía y 2 más" */
function namesList(names: string[]) {
  if (names.length <= 3) return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
  return `${names.slice(0, 3).join(", ")} y ${names.length - 3} más`;
}

/**
 * Pre-race look at the track: what has happened here before and how each
 * entrant has done on it.
 */
export async function TrackPreview({ race }: { race: RaceDetail }) {
  const { track } = race;
  const { races, drivers } = await getStatsData({ trackId: track.id });

  const entrants = new Map(race.registrations.map((r) => [r.user.id, r]));
  const nameOf = (userId: string) => drivers.get(userId)?.name ?? entrants.get(userId)?.user.name ?? "—";
  const country = countryName(track.countryCode);
  const facts = [country !== track.name && country, track.expansion].filter(Boolean).join(" · ");

  const records = championshipRecords(races);
  const pole = gridStats(races)[0];
  const kings = records.mostWins;
  const comeback = records.biggestComeback?.holders[0];
  const history = raceHistory(races);
  const rows = entrantRecords(races, [...entrants.keys()]);

  return (
    <Section title={`En ${track.name}`}>
      {(track.description || facts) && (
        <div className="flex flex-col gap-1 text-sm text-fg-muted">
          {facts && <p className="font-display text-xs font-bold uppercase tracking-wider">{facts}</p>}
          {track.description && <p className="whitespace-pre-line">{track.description}</p>}
        </div>
      )}

      {races.length === 0 ? (
        <Card className="border-l-4 border-primary p-5">
          <p className="font-display text-xl font-bold uppercase italic">Primera visita del campeonato</p>
          <p className="text-sm text-fg-muted">Todos los pilotos debutan en este circuito: no hay favoritos.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Carreras aquí"
              value={races.length}
              hint={`Última: ${formatDate(races[races.length - 1].scheduledAt)}`}
              icon={<Flag />}
            />
            <StatCard
              label="Rey del circuito"
              value={!kings ? "—" : kings.holders.length === 1 ? nameOf(kings.holders[0].userId) : "Empate"}
              hint={
                !kings
                  ? "Nadie ha ganado aún"
                  : kings.holders.length === 1
                    ? `${kings.value} ${kings.value === 1 ? "victoria" : "victorias"}`
                    : `${namesList(kings.holders.map((h) => nameOf(h.userId)))} · ${kings.value} ${kings.value === 1 ? "victoria" : "victorias"} cada uno`
              }
              icon={<Crown />}
            />
            <StatCard
              label="Gana el que sale 1º"
              value={pole?.uses ? formatPercent(pole.winRate) : "—"}
              hint={pole?.uses ? `${pole.wins} de ${pole.uses} carreras` : "Sin parrillas anotadas"}
              icon={<Rocket />}
            />
            <StatCard
              label="Mayor remontada"
              value={records.biggestComeback ? `+${records.biggestComeback.value}` : "—"}
              hint={
                comeback
                  ? `${nameOf(comeback.userId)} · ${comeback.detail}`
                  : "Nadie ha ganado posiciones aún"
              }
              icon={<TrendingUp />}
            />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-3">
            {rows.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div>
                    <CardTitle>Los inscritos aquí</CardTitle>
                    <CardDescription>Su historial en {track.name}, mejor media de llegada primero.</CardDescription>
                  </div>
                </CardHeader>
                <Table>
                  <THead>
                    <tr>
                      <Th>Piloto</Th>
                      <Th align="center" title="Carreras en este circuito">
                        Carr.
                      </Th>
                      <Th align="center" title="Victorias">
                        V
                      </Th>
                      <Th align="center" title="Podios">
                        P
                      </Th>
                      <Th align="center" title="Mejor resultado">
                        Mejor
                      </Th>
                      <Th align="right" className="max-sm:hidden" title="Posición media de llegada">
                        Media
                      </Th>
                      <Th align="center" className="max-sm:hidden" title="Resultado la última vez">
                        Última
                      </Th>
                    </tr>
                  </THead>
                  <TBody>
                    {rows.map(({ userId, stats }) => {
                      const entrant = entrants.get(userId)!;
                      return (
                        <Tr key={userId}>
                          <Td>
                            <DriverName
                              name={entrant.user.name}
                              username={entrant.user.username}
                              color={entrant.user.favoriteColor?.hex}
                              detail={entrant.status === "WAITLIST" ? "En reserva" : undefined}
                            />
                          </Td>
                          {stats ? (
                            <>
                              <Td align="center">{stats.starts}</Td>
                              <Td align="center">{stats.wins}</Td>
                              <Td align="center">{stats.podiums}</Td>
                              <Td align="center">
                                <PositionBadge position={stats.bestFinish!} size="sm" />
                              </Td>
                              <Td align="right" className="max-sm:hidden">
                                {stats.averageFinish == null ? "—" : formatDecimal(stats.averageFinish)}
                              </Td>
                              <Td align="center" className="max-sm:hidden">
                                <PositionBadge position={stats.form[0]} size="sm" />
                              </Td>
                            </>
                          ) : (
                            <Td colSpan={6} className="text-fg-muted italic">
                              Debuta en este circuito
                            </Td>
                          )}
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </Card>
            )}

            <Card className={rows.length === 0 ? "lg:col-span-3" : undefined}>
              <CardHeader>
                <CardTitle>Historial</CardTitle>
              </CardHeader>
              <ol className="flex flex-col divide-y divide-border/60">
                {history.slice(0, HISTORY_LIMIT).map(({ race: past, scheduledAt, podium }) => (
                  <li key={past.id} className="flex flex-col gap-1.5 px-5 py-3">
                    <Link
                      href={`/carreras/${past.id}`}
                      className="text-xs text-fg-muted hover:text-primary hover:underline"
                    >
                      {formatDate(scheduledAt)} · {past.seasonName} · R{past.round}
                    </Link>
                    {podium[0] && (
                      <div className="flex items-center gap-2.5">
                        <PositionBadge position={1} size="sm" />
                        <DriverName
                          name={nameOf(podium[0])}
                          username={drivers.get(podium[0])?.username}
                          color={drivers.get(podium[0])?.favoriteColor?.hex}
                        />
                      </div>
                    )}
                    {(podium[1] || podium[2]) && (
                      <p className="text-xs text-fg-muted">
                        {podium
                          .slice(1)
                          .map((userId, i) => userId && `${i + 2}º ${nameOf(userId)}`)
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {history.length > HISTORY_LIMIT && (
                <p className="px-5 pb-3 text-xs text-fg-muted">y {history.length - HISTORY_LIMIT} carreras más</p>
              )}
            </Card>
          </div>
        </>
      )}
    </Section>
  );
}
