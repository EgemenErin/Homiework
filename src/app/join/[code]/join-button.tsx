"use client";

import { useActionState } from "react";
import { joinGroup } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions";

export function JoinGroupButton({
  code,
  groupName,
}: {
  code: string;
  groupName: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    joinGroup,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Joining…" : `Join ${groupName}`}
      </Button>
      <FormError message={state?.error} />
    </form>
  );
}
