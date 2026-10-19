"use client";

import { useState, useTransition } from "react";
import { Target } from "lucide-react";
import { savePrediction } from "@/actions/predictions";
import { Alert, Button, Field, Modal, Select } from "@/components/ui";
import { t } from "@/i18n";

const KEYS = ["first", "second", "third"] as const;

/** A button that opens a dialog with three selects, one per podium place. */
export function PredictionForm({ raceId, drivers, current }: { raceId: string; drivers: { id: string; name: string }[]; current: string[] | null }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [picks, setPicks] = useState(() => current ?? ["", "", ""]);

  const show = () => {
    setPicks(current ?? ["", "", ""]);
    setError(undefined);
    setOpen(true);
  };

  return (
    <>
      <Button size="sm" variant={current ? "secondary" : "primary"} onClick={show} className="self-start">
        <Target /> {current ? t.predictions.update : t.predictions.save}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t.predictions.title}
        description={t.predictions.rules}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.forms.cancel}
            </Button>
            <Button type="submit" form={`prediction-${raceId}`} loading={pending}>
              <Target /> {t.predictions.submit}
            </Button>
          </>
        }
      >
        <form
          id={`prediction-${raceId}`}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await savePrediction({}, data);
              setError(result.error);
              if (!result.error) setOpen(false);
            });
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="raceId" value={raceId} />
          {error && <Alert tone="danger">{error}</Alert>}
          {KEYS.map((key, i) => (
            <Field key={key} label={t.predictions.places[i]} htmlFor={`prediction-${key}`}>
              <Select
                id={`prediction-${key}`}
                name={key}
                required
                value={picks[i]}
                onChange={(e) => setPicks((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
              >
                <option value="" disabled>
                  {t.predictions.choose}
                </option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id} disabled={picks.includes(d.id) && picks[i] !== d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </form>
      </Modal>
    </>
  );
}
