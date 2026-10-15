"use client";

import { useActionState } from "react";
import { siteConfig } from "@/config/site";
import type { Race, RaceStatus } from "@/generated/prisma/client";
import { toLocalInput } from "@/lib/dates";
import { RACE_STATUS } from "@/lib/races";
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
  /** Defaults when creating */
  defaults?: { seasonId?: string; round?: number };
};

const editableStatuses: RaceStatus[] = ["DRAFT", "UPCOMING", "OPEN", "CLOSED"];

export function RaceForm({ action, seasons, tracks, race, defaults }: RaceFormProps) {
  const [state, formAction] = useActionState(action, {});
  const finished = race?.status === "FINISHED";

  return (
    <form action={formAction}>
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
        <DateTimeField
          name="scheduledAt"
          label={t.admin.racesAdmin.dateTime}
          state={state}
          hint={t.admin.racesAdmin.timeZoneHint(siteConfig.timeZone.split("/").at(-1)!.replaceAll("_", " "))}
          defaultValue={race ? toLocalInput(race.scheduledAt) : undefined}
        />
        <DateTimeField
          name="signupDeadline"
          label={t.admin.racesAdmin.signupDeadline}
          clearable
          state={state}
          hint={t.admin.racesAdmin.signupDeadlineHint}
          defaultValue={race?.signupDeadline ? toLocalInput(race.signupDeadline) : undefined}
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
