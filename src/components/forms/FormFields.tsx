"use client";

import { useState } from "react";
import type { FormState } from "@/lib/forms";
import { Alert, ButtonLink, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui";

/**
 * Form fields wired to a FormState: they show the field's error and, after a
 * failed submit, refill with what the user typed (React resets forms after an
 * action, so values come back through `state.values`).
 */

type Common = {
  name: string;
  label: string;
  state: FormState;
  hint?: string;
  className?: string;
};

function fieldProps({ name, state }: Pick<Common, "name" | "state">) {
  const error = state.fieldErrors?.[name];
  return { id: name, name, "aria-invalid": error ? true : undefined, error };
}

/** Echoed value after an error, otherwise the initial value. */
function valueOf(state: FormState, name: string, initial: string | number | null | undefined) {
  return state.values?.[name] ?? (initial == null ? "" : String(initial));
}

type TextFieldProps = Common &
  Omit<React.ComponentProps<"input">, "name" | "defaultValue"> & {
    defaultValue?: string | number | null;
  };

export function TextField({ name, label, state, hint, className, defaultValue, ...input }: TextFieldProps) {
  const { error, ...props } = fieldProps({ name, state });
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error} className={className}>
      <Input {...props} {...input} defaultValue={valueOf(state, name, defaultValue)} />
    </Field>
  );
}

type TextareaFieldProps = Common &
  Omit<React.ComponentProps<"textarea">, "name" | "defaultValue"> & {
    defaultValue?: string | null;
  };

export function TextareaField({ name, label, state, hint, className, defaultValue, ...rest }: TextareaFieldProps) {
  const { error, ...props } = fieldProps({ name, state });
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error} className={className}>
      <Textarea {...props} {...rest} defaultValue={valueOf(state, name, defaultValue)} />
    </Field>
  );
}

type SelectFieldProps = Common & {
  options: { value: string; label: string; disabled?: boolean }[];
  defaultValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
};

export function SelectField({
  name,
  label,
  state,
  hint,
  className,
  options,
  defaultValue,
  placeholder,
  disabled,
}: SelectFieldProps) {
  const { error, ...props } = fieldProps({ name, state });
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error} className={className}>
      <Select {...props} disabled={disabled} defaultValue={valueOf(state, name, defaultValue)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

type CheckboxFieldProps = Omit<Common, "hint"> & { defaultChecked?: boolean };

export function CheckboxField({ name, label, state, className, defaultChecked }: CheckboxFieldProps) {
  // After a failed submit, unchecked boxes are absent from the echoed values
  const checked = state.values ? state.values[name] === "on" : defaultChecked;
  return <Checkbox id={name} name={name} label={label} defaultChecked={checked} className={className} />;
}

type FormLayoutProps = {
  state: FormState;
  submitLabel: string;
  cancelHref?: string;
  children: React.ReactNode;
};

/**
 * React resets a form after its action runs, and <select>s don't pick up new
 * default values on reset. Remounting the fields whenever a new state arrives
 * makes every field show the echoed `state.values`.
 */
function useRemountKey(state: FormState) {
  const [seen, setSeen] = useState(state);
  const [key, setKey] = useState(0);
  if (state !== seen) {
    setSeen(state);
    setKey(key + 1);
  }
  return key;
}

/** Top-level error, a two-column field grid and the save/cancel row. */
export function FormLayout({ state, submitLabel, cancelHref, children }: FormLayoutProps) {
  const key = useRemountKey(state);
  return (
    <div className="flex flex-col gap-5">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <div key={key} className="grid gap-4 md:grid-cols-2">
        {children}
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        {cancelHref && (
          <ButtonLink href={cancelHref} variant="ghost">
            Cancelar
          </ButtonLink>
        )}
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </div>
  );
}
