"use client";

import { useState } from "react";
import { CalendarPlus, MoveRight, Plus } from "lucide-react";
import { Button, ButtonLink, Modal } from "@/components/ui";
import { t } from "@/i18n";

export type MovableRace = { id: string; title: string; when: string };

type ScheduleRaceButtonProps = {
  pollId: string;
  day: string;
  /** "sábado, 14 de noviembre" */
  dayName: string;
  /** Races not raced yet, which can be moved to this day instead */
  races: MovableRace[];
};

/** Admin: create a race on a poll's day, or move an already scheduled one there (both open the race form to confirm). */
export function ScheduleRaceButton({ pollId, day, dayName, races }: ScheduleRaceButtonProps) {
  const [open, setOpen] = useState(false);
  const query = `?dia=${day}&encuesta=${pollId}`;
  const newRace = `/admin/carreras/nueva${query}`;

  if (races.length === 0) {
    return (
      <ButtonLink href={newRace} size="sm" variant="secondary">
        <CalendarPlus /> {t.datePoll.schedule}
      </ButtonLink>
    );
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <CalendarPlus /> {t.datePoll.schedule}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.datePoll.scheduleTitle(dayName)} description={t.datePoll.scheduleDescription}>
        <ul className="flex flex-col gap-2">
          {races.map((race) => (
            <li key={race.id} className="flex flex-wrap items-center justify-between gap-2 border-l-4 border-border-strong bg-surface px-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="font-display font-bold uppercase">{race.title}</span>
                <span className="text-sm text-fg-muted">{t.datePoll.currentDate(race.when)}</span>
              </span>
              <ButtonLink href={`/admin/carreras/${race.id}${query}`} size="sm" variant="secondary">
                <MoveRight /> {t.datePoll.moveRace}
              </ButtonLink>
            </li>
          ))}
        </ul>
        <ButtonLink href={newRace} size="sm" className="mt-4">
          <Plus /> {t.datePoll.newRace}
        </ButtonLink>
      </Modal>
    </>
  );
}
