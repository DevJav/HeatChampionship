import type { FormState } from "@/lib/forms";

/** A server action usable with useActionState (optionally pre-bound to an id). */
export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;
