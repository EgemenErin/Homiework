"use client";

import { useActionState, useState } from "react";
import { sendCode, verifyCode, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";

export function LoginForm({ next }: { next: string }) {
  const [sendState, sendAction, sending] = useActionState<LoginState, FormData>(
    sendCode,
    null,
  );
  const [verifyState, verifyAction, verifying] = useActionState<
    LoginState,
    FormData
  >(verifyCode, null);
  const [changeEmail, setChangeEmail] = useState(false);

  const sent = Boolean(sendState?.sent) && !changeEmail;
  const email = sendState?.email ?? "";

  if (sent) {
    return (
      <form action={verifyAction} className="space-y-6">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />

        <p className="text-base text-ink">
          We sent a 6-digit code and a sign-in link to{" "}
          <span className="font-semibold">{email}</span>.
        </p>

        <Field
          label="6-digit code"
          htmlFor="code"
          hint="Check your inbox and spam folder, or tap the link in the email."
          error={verifyState?.error}
        >
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            placeholder="123456"
            aria-invalid={Boolean(verifyState?.error)}
            aria-describedby={verifyState?.error ? "code-error" : "code-hint"}
            className={`${inputClass} tracking-widest`}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="primary" size="lg" disabled={verifying}>
            {verifying ? "Signing in…" : "Sign in"}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={() => setChangeEmail(true)}
          >
            Use a different email
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      action={sendAction}
      onSubmit={() => setChangeEmail(false)}
      className="space-y-6"
    >
      <input type="hidden" name="next" value={next} />

      <Field
        label="Email address"
        htmlFor="email"
        hint="We'll email you a sign-in link and a 6-digit code. No password needed."
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={email}
          placeholder="you@example.com"
          aria-invalid={Boolean(sendState?.error)}
          aria-describedby="email-hint"
          className={inputClass}
        />
      </Field>

      <FormError message={sendState?.error} />

      <div>
        <Button type="submit" variant="primary" size="lg" disabled={sending}>
          {sending ? "Sending code…" : "Email me a sign-in code"}
        </Button>
      </div>
    </form>
  );
}
