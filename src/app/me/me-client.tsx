"use client";

import { useEffect, useState, useTransition } from "react";
import { leaveGroup } from "@/app/actions/groups";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/app/actions/push";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushSettings({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [status, setStatus] = useState<
    "checking" | "ios-install" | "unsupported" | "ready"
  >("checking");
  const [enabled, setEnabled] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const ua = navigator.userAgent;
      const isIos = /iPad|iPhone|iPod/.test(ua);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      if (isIos && !isStandalone) {
        if (active) setStatus("ios-install");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (active) setStatus("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (active) {
          setEnabled(Boolean(sub));
          setStatus("ready");
        }
      } catch {
        if (active) setStatus("ready");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (status === "ios-install") {
    return (
      <p className="text-base text-pencil">
        On iPhone, tap <span className="font-semibold text-ink">Share</span> in Safari and pick{" "}
        <span className="font-semibold text-ink">Add to Home Screen</span> first. Once Homiework opens from your home screen, you can turn on reminders here.
      </p>
    );
  }

  if (status === "unsupported" || !vapidPublicKey) {
    return (
      <p className="text-base text-pencil">
        Push reminders are not configured on this browser or server yet.
      </p>
    );
  }

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await removePushSubscription(existing.endpoint);
          await existing.unsubscribe();
          setEnabled(false);
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setError(
            "Notifications are blocked in your browser settings. Allow notifications for this site and try again.",
          );
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        const json = sub.toJSON();
        const res = await savePushSubscription({
          endpoint: json.endpoint,
          keys: json.keys,
        });
        if (res?.error) {
          setError(res.error);
        } else {
          setEnabled(true);
        }
      } catch {
        setError(
          "Could not enable reminders on this device. Try again after reloading.",
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {enabled ? "Reminders are on for this device" : "Reminders are off"}
          </p>
          <p className="text-sm text-pencil">
            Get a ping when the weekly topic drops, when it is your turn, and the day before the meetup.
          </p>
        </div>
        <Button
          type="button"
          variant={enabled ? "secondary" : "primary"}
          size="md"
          disabled={isPending}
          onClick={handleToggle}
        >
          {isPending
            ? "Saving…"
            : enabled
              ? "Turn off"
              : "Turn on reminders"}
        </Button>
      </div>
      <FormError message={error} />
    </div>
  );
}

export function LeaveGroupControl({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLeave() {
    setError(null);
    startTransition(async () => {
      const res = await leaveGroup(groupId);
      if (res?.error) setError(res.error);
    });
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="tertiary"
        onClick={() => setConfirming(true)}
      >
        Leave
      </Button>
    );
  }

  return (
    <div className="space-y-2 pt-2">
      <p className="text-sm text-ink">
        Leave <span className="font-semibold">{groupName}</span>? You can rejoin later with the invite link.
      </p>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="danger"
          size="md"
          disabled={isPending}
          onClick={handleLeave}
        >
          {isPending ? "Leaving…" : `Leave ${groupName}`}
        </Button>
        <Button
          type="button"
          variant="tertiary"
          disabled={isPending}
          onClick={() => setConfirming(false)}
        >
          Stay
        </Button>
      </div>
      <FormError message={error} />
    </div>
  );
}
