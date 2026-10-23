"use client";

import { useActionState, useState } from "react";
import { siteConfig } from "@/config/site";
import type { Race, RaceStatus } from "@/generated/prisma/client";
import { toLocalInput } from "@/lib/dates";
import { addMonths, formatMonth, monthRange } from "@/lib/month-calendar";
import { RACE_STATUS, raceMonth } from "@/lib/races";
import { Checkbox } from "@/components/ui";
import { DateTimeField, FormLayout, SelectField, TextareaField, TextField } from "@/components/forms/FormFields";
import type { FormAction } from "@/lib/forms";
import { t } from "@/i18n";

type Option = { id: string; name: string };

type RaceFormProps = {
  action: FormAction;
  seasons: Option[];
  tracks: (Option & { defaultLaps: number | null })[];
  /** Existing race when editing */
  race?: Race;
  /**
   * Defaults when creating. A date poll's "Schedule race" also passes the new date (and deadline)
   * when editing; `datePollId` closes that poll once the race is saved.
   */
  defaults?: { seasonId?: string; round?: number; scheduledAt?: string; signupDeadline?: string; datePollId?: string };
};

const editableStatuses: RaceStatus[] = ["DRAFT", "UPCOMING", "OPEN", "CLOSED"];

/** Months a race with no day yet can be in: from a little back to a year and a half ahead, plus its own. */
function monthOptions(current: string | undefined) {
  const thisMonth = toLocalInput(new Date()).slice(0, 7);
  const first = current && current < thisMonth ? current : addMonths(thisMonth, -2);
  return monthRange(first, addMonths(thisMonth, 18)).map((month) => ({ value: month, label: formatMonth(month) }));
}

export function RaceForm({ action, seasons, tracks, race, defaults }: RaceFormProps) {
  const [state, formAction] = useActionState(action, {});
  const finished = race?.status === "FINISHED";
  // A date poll's "Schedule race" brings a real day
  const [tbd, setTbd] = useState(!defaults?.scheduledAt && (race?.dateTbd ?? false));
  const month = race ? raceMonth(race) : undefined;

  return (
    <form action={formAction}>
      {defaults?.datePollId && <input type="hidden" name="datePollId" value={defaults.datePollId} />}
      <FormLayout state={state} submitLabel={race ? t.admin.saveChanges : t.admin.racesAdmin.create} cancelHref="/admin/carreras">
        <SelectField
          name="seasonId"
          label={t.admin.racesAdmin.season}
          state={state}
          defaultValue={race?.seasonId ?? defaults?.seasonId}
          options={seasons.map((s) => ({ value: s.id, label: s.name }))}
        />
        <TextField
          name="round"
          label={t.admin.racesAdmin.round}
          type="number"
          min={1}
          state={state}
          defaultValue={race?.round ?? defaults?.round}
        />
        <SelectField
          name="trackId"
          label={t.admin.racesAdmin.track}
          state={state}
          placeholder={t.admin.racesAdmin.chooseTrack}
          defaultValue={race?.trackId}
          options={tracks.map((track) => ({
            value: track.id,
            label: track.defaultLaps ? t.admin.racesAdmin.trackWithLaps(track.name, track.defaultLaps) : track.name,
          }))}
        />
        <TextField
          name="laps"
          label={t.admin.racesAdmin.laps}
          type="number"
          min={1}
          state={state}
          hint={t.admin.racesAdmin.lapsHint}
          defaultValue={race?.laps}
        />
        <div className="flex flex-col gap-2">
          {tbd ? (
            <SelectField
              name="month"
              label={t.admin.racesAdmin.month}
              state={state}
              hint={t.admin.racesAdmin.dateTbdHint}
              options={monthOptions(month)}
              defaultValue={month ?? addMonths(toLocalInput(new Date()).slice(0, 7), 1)}
            />
          ) : (
            <DateTimeField
              name="scheduledAt"
              label={t.admin.racesAdmin.dateTime}
              state={state}
              hint={t.admin.racesAdmin.timeZoneHint(siteConfig.timeZone.split("/").at(-1)!.replaceAll("_", " "))}
              // A race with no day yet holds a placeholder time, not worth showing
              defaultValue={defaults?.scheduledAt ?? (race && !race.dateTbd ? toLocalInput(race.scheduledAt) : undefined)}
            />
          )}
          <Checkbox
            id="dateTbd"
            name="dateTbd"
            label={t.admin.racesAdmin.dateTbd}
            checked={tbd}
            disabled={finished}
            onChange={(e) => setTbd(e.target.checked)}
          />
        </div>
        <DateTimeField
          name="signupDeadline"
          label={t.admin.racesAdmin.signupDeadline}
          clearable
          state={state}
          hint={t.admin.racesAdmin.signupDeadlineHint}
          defaultValue={defaults?.signupDeadline ?? (race?.signupDeadline ? toLocalInput(race.signupDeadline) : undefined)}
        />
        <TextField name="location" label={t.admin.racesAdmin.location} state={state} placeholder={t.admin.racesAdmin.locationPlaceholder} defaultValue={race?.location} />
        <TextField
          name="maxPlayers"
          label={t.admin.racesAdmin.seats}
          type="number"
          min={2}
          max={siteConfig.maxPlayersPerRace}
          state={state}
          defaultValue={race?.maxPlayers ?? siteConfig.maxPlayersPerRace}
        />
        <SelectField
          name="status"
          label={t.admin.status}
          state={state}
          disabled={finished}
          hint={
            finished
              ? t.admin.racesAdmin.statusFinishedHint
              : t.admin.racesAdmin.statusHint
          }
          defaultValue={race?.status ?? "DRAFT"}
          options={(finished ? (["FINISHED"] as RaceStatus[]) : editableStatuses).map((status) => ({
            value: status,
            label: RACE_STATUS[status].label,
          }))}
        />
        <TextareaField
          name="notes"
          label={t.admin.racesAdmin.notes}
          state={state}
          className="md:col-span-2"
          placeholder={t.admin.racesAdmin.notesPlaceholder}
          defaultValue={race?.notes}
        />
      </FormLayout>
    </form>
  );
}
