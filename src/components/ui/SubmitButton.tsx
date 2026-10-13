"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";

type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type" | "loading">;

/** Submit button that shows a spinner while its parent <form> action runs. */
export function SubmitButton(props: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} {...props} />;
}
