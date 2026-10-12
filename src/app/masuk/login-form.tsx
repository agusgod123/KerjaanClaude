"use client";

import { useActionState } from "react";
import { login } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="NIP atau email">
        {(p) => <Input {...p} name="identifier" autoComplete="username" inputMode="email" autoCapitalize="none" required />}
      </Field>
      <Field label="Kata sandi" error={state.error}>
        {(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Memeriksa…" : "Masuk"}
      </Button>
    </form>
  );
}
