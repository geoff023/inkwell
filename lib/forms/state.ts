import { z } from "zod";

/** Shape returned by every form Server Action and read with useActionState. */
export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};

export function invalid(error: z.ZodError, values?: Record<string, string>): FormState {
  const { fieldErrors } = z.flattenError(error);
  return { fieldErrors: fieldErrors as FormState["fieldErrors"], values };
}
