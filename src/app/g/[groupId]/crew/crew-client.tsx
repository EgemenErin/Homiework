"use client";

import { Check, Copy, RotateCcw, Share2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { regenerateInvite } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import type { Member } from "@/lib/data";

const RotationEditor = dynamic(() => import("./rotation-editor"), {
  loading: () => (
    <p className="text-sm text-pencil">Loading rotation editor…</p>
  ),
});

export function InviteBox({
  groupId,
  groupName,
  inviteCode,
  isOwner,
}: {
  groupId: string;
  groupName: string;
  inviteCode: string;
  isOwner: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function getUrl() {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    return `${origin}/join/${inviteCode}`;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Select and copy the link below.");
    }
  }

  async function handleShare() {
    const url = getUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on Homiework`,
          text: `Join ${groupName} on Homiework so we can rotate weekly study topics:`,
          url,
        });
        return;
      } catch {
        // User cancelled share sheet
      }
    }
    await handleCopy();
  }

  function handleReset() {
    setError(null);
    startTransition(async () => {
      const res = await regenerateInvite(groupId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rule bg-desk-deep px-3.5 py-2.5">
        <code className="truncate text-sm text-ink">/join/{inviteCode}</code>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check aria-hidden className="size-4 text-red" />
                Copied
              </>
            ) : (
              <>
                <Copy aria-hidden className="size-4" />
                Copy link
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleShare}
          >
            <Share2 aria-hidden className="size-4" />
            Invite
          </Button>
        </div>
      </div>

      {isOwner ? (
        <div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleReset}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-pencil underline decoration-rule decoration-2 underline-offset-4 hover:text-ink"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            {isPending ? "Resetting invite link…" : "Reset invite link"}
          </button>
        </div>
      ) : null}

      <FormError message={error} />
    </div>
  );
}

export function RotationReorderTrigger({
  groupId,
  members,
}: {
  groupId: string;
  members: readonly Member[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="pt-2">
        <RotationEditor
          groupId={groupId}
          initialMembers={members}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="tertiary"
      onClick={() => setEditing(true)}
    >
      Change rotation order
    </Button>
  );
}
