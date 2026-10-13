import { seasonPodiums, type Unlock } from "@/lib/achievements";
import type { StatsDriver } from "@/lib/data/stats";
import { cn } from "@/lib/cn";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { DriverName } from "@/components/domain/DriverName";

const MEDAL = { 1: "bg-gold", 2: "bg-silver", 3: "bg-bronze" } as const;

/** Every finished season's top three, newest first. */
export function PalmaresTable({ unlocks, drivers }: { unlocks: Unlock[]; drivers: Map<string, StatsDriver> }) {
  const podiums = seasonPodiums(unlocks);
  const names = (userIds: string[], place: 1 | 2 | 3) =>
    userIds.length === 0 ? (
      <span className="text-fg-subtle">—</span>
    ) : (
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", MEDAL[place])} />
        {userIds.map((id) => {
          const driver = drivers.get(id);
          return (
            <DriverName key={id} name={driver?.name ?? "—"} username={driver?.username} color={driver?.favoriteColor?.hex} />
          );
        })}
      </span>
    );

  return (
    <Table>
      <THead>
        <tr>
          <Th>Temporada</Th>
          <Th>Campeón</Th>
          <Th className="max-sm:hidden">Subcampeón</Th>
          <Th className="max-md:hidden">Tercero</Th>
        </tr>
      </THead>
      <TBody>
        {podiums.map(({ season, places }) => (
          <Tr key={season.id}>
            <Td className="font-display font-bold uppercase italic whitespace-nowrap">{season.name}</Td>
            <Td>{names(places[1], 1)}</Td>
            <Td className="max-sm:hidden">{names(places[2], 2)}</Td>
            <Td className="max-md:hidden">{names(places[3], 3)}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
