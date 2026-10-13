import { z } from "zod";

/**
 * State returned by form server actions and consumed with useActionState.
 * `values` echoes text inputs back so the form keeps what was typed.
 */
export type FormState = {
  error?: string;
  /** Success notice (for forms that stay on the page) */
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

/** First error message per field, keyed by field name. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    result[key] ??= issue.message;
  }
  return result;
}

/** Text values of a FormData (files skipped), for echoing back on errors. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; state: FormState };

/** Validate FormData against a schema; on failure returns a ready-to-return FormState. */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData): ParseResult<z.output<T>> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    state: { fieldErrors: fieldErrorsOf(parsed.error), values: formValues(formData) },
  };
}

// ---------------------------------------------------------------------------
// Field helpers — HTML forms send strings; these convert and validate them.
// ---------------------------------------------------------------------------

/** Required trimmed text. */
export const text = (max = 200) =>
  z.string().trim().min(1, "Obligatorio.").max(max, `Máximo ${max} caracteres.`);

/** Optional trimmed text; empty string becomes null. */
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .optional()
    .transform((value) => (value ? value : null));

/** Required whole number within bounds. */
export const int = (min: number, max: number) =>
  z.coerce
    .number({ error: "Introduce un número." })
    .int("Debe ser un número entero.")
    .min(min, `Mínimo ${min}.`)
    .max(max, `Máximo ${max}.`);

/** Optional whole number; empty string becomes null. */
export const optionalInt = (min: number, max: number) =>
  z.preprocess((value) => (value === "" || value == null ? null : value), int(min, max).nullable());

/** Checkbox: present ("on") → true, absent → false. */
export const checkbox = () =>
  z.preprocess((value) => value === "on" || value === "true", z.boolean());

/** A server action usable with useActionState (optionally pre-bound to an id). */
export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;
