"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  sendCode,
  verifyCode,
  type LoginMode,
  type LoginState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { triggerHaptic } from "@/lib/haptics";

function detectMode(input: string): LoginMode {
  const trimmed = input.trim();
  if (!trimmed) return "phone";
  if (trimmed.includes("@") || /[a-zA-Z]/.test(trimmed)) {
    return "email";
  }
  return "phone";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

/**
 * Hand-drawn editorial line-art illustration of three friends with coffee,
 * notes, and a study handout, styled with Homiework's ink, paper, red & highlight tokens.
 */
export function StudyCrewIllustration() {
  return (
    <svg
      viewBox="0 0 280 168"
      fill="none"
      aria-hidden="true"
      className="mx-auto h-40 w-auto select-none"
    >
      {/* Subtle warm desk shadow */}
      <ellipse cx="140" cy="156" rx="112" ry="7" fill="#E3DCD2" />

      {/* Left friend — holding warm red coffee mug */}
      <g>
        {/* Shoulders / sweater */}
        <path
          d="M36 154C38 122 52 108 76 108C98 108 110 122 112 154Z"
          fill="#F0EBE3"
          stroke="#111111"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Neck & head */}
        <path
          d="M68 96V110H84V96"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.5"
        />
        <rect
          x="56"
          y="54"
          width="40"
          height="46"
          rx="18"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.5"
        />
        {/* Curly bun hair */}
        <circle cx="58" cy="44" r="11" fill="#111111" />
        <circle cx="72" cy="40" r="12" fill="#111111" />
        <path
          d="M56 64C60 52 90 52 96 64"
          fill="#111111"
        />
        {/* Eyes & warm smile */}
        <circle cx="70" cy="74" r="2.2" fill="#111111" />
        <circle cx="84" cy="74" r="2.2" fill="#111111" />
        <path
          d="M72 85C75 88 81 88 84 85"
          stroke="#111111"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Red coffee mug */}
        <rect
          x="74"
          y="118"
          width="18"
          height="22"
          rx="3"
          fill="#C8102E"
          stroke="#111111"
          strokeWidth="2.2"
        />
        <path
          d="M92 123H96C98.2 123 100 124.8 100 127V131C100 133.2 98.2 135 96 135H92"
          stroke="#111111"
          strokeWidth="2.2"
        />
      </g>

      {/* Center friend — with open study notebook / laptop */}
      <g>
        <path
          d="M98 154C100 118 116 104 140 104C164 104 180 118 182 154Z"
          fill="#C8102E"
          stroke="#111111"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M132 92V106H148V92"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.5"
        />
        <rect
          x="120"
          y="48"
          width="40"
          height="46"
          rx="18"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.5"
        />
        {/* Hair */}
        <path
          d="M118 62C118 46 130 38 144 40C156 42 162 50 160 62C152 54 130 54 118 62Z"
          fill="#111111"
        />
        {/* Eyes & smile */}
        <circle cx="134" cy="70" r="2.2" fill="#111111" />
        <circle cx="148" cy="70" r="2.2" fill="#111111" />
        <path
          d="M136 81C139 84 145 84 148 81"
          stroke="#111111"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Open notebook / laptop in front */}
        <path
          d="M118 122L166 118L162 150L114 152Z"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <line
          x1="124"
          y1="130"
          x2="154"
          y2="128"
          stroke="#FFE45C"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="124"
          y1="138"
          x2="148"
          y2="137"
          stroke="#111111"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Right friend — holding highlighted study card */}
      <g>
        <path
          d="M168 154C170 122 184 108 206 108C228 108 242 122 244 154Z"
          fill="#111111"
          stroke="#111111"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M198 96V110H214V96"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.5"
        />
        <rect
          x="186"
          y="54"
          width="40"
          height="46"
          rx="18"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2.5"
        />
        {/* Swept hair */}
        <path
          d="M186 62C186 46 202 38 220 44C226 46 228 54 226 62C216 54 196 54 186 62Z"
          fill="#FFE45C"
          stroke="#111111"
          strokeWidth="2.3"
        />
        {/* Glasses & smile */}
        <circle
          cx="198"
          cy="74"
          r="5"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2"
        />
        <circle
          cx="212"
          cy="74"
          r="5"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="2"
        />
        <line x1="203" y1="74" x2="207" y2="74" stroke="#111111" strokeWidth="2" />
        <path
          d="M200 85C203 88 209 88 212 85"
          stroke="#111111"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Handout card */}
        <rect
          x="212"
          y="114"
          width="20"
          height="26"
          rx="3"
          transform="rotate(8 212 114)"
          fill="#FFE45C"
          stroke="#111111"
          strokeWidth="2.2"
        />
      </g>
    </svg>
  );
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (
    arg: (() => void) | { update: () => void; types?: string[] },
  ) => { finished: Promise<void> };
};

function runTransition(direction: "forward" | "backward", fn: () => void) {
  triggerHaptic("light");
  if (typeof document === "undefined") {
    fn();
    return;
  }
  const doc = document as ViewTransitionDoc;
  if (typeof doc.startViewTransition !== "function") {
    fn();
    return;
  }
  try {
    doc.startViewTransition({
      update: () => {
        flushSync(fn);
      },
      types: [direction],
    });
  } catch {
    fn();
  }
}

export function LoginForm({ next }: { next: string }) {
  const [sendState, sendAction, sending] = useActionState<LoginState, FormData>(
    sendCode,
    null,
  );
  const [verifyState, verifyAction, verifying] = useActionState<
    LoginState,
    FormData
  >(verifyCode, null);

  const [identifier, setIdentifier] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [changeTarget, setChangeTarget] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(55);
  const [greeting] = useState(getGreeting);

  const sendFormRef = useRef<HTMLFormElement | null>(null);
  const verifyFormRef = useRef<HTMLFormElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const otpAbortRef = useRef<AbortController | null>(null);

  const inferredMode = detectMode(identifier);
  const activeMode: LoginMode = sendState?.mode ?? inferredMode;
  const sent = Boolean(sendState?.sent) && !changeTarget;
  const email =
    sendState?.email ?? (inferredMode === "email" ? identifier.trim() : "");
  const phone =
    sendState?.phone ?? (inferredMode === "phone" ? identifier.trim() : "");
  const previewMessage = sendState?.previewMessage;
  const previewCodeMatch = previewMessage
    ? /\b(\d{6})\b/.exec(previewMessage)
    : null;
  const previewCode = previewCodeMatch?.[1] ?? null;

  // Countdown timer for "Send again in Xs"
  useEffect(() => {
    if (!sent) return;
    const id = window.setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [sent]);

  // WebOTP auto-read on mobile browsers
  useEffect(() => {
    if (!sent || activeMode !== "phone") return;
    if (typeof window === "undefined" || !("OTPCredential" in window)) return;

    otpAbortRef.current?.abort();
    const ac = new AbortController();
    otpAbortRef.current = ac;

    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((cred) => {
        const otp = cred as (Credential & { code?: string }) | null;
        if (!otp?.code) return;
        triggerHaptic("success");
        setCodeInput(otp.code);
        requestAnimationFrame(() => {
          verifyFormRef.current?.requestSubmit();
        });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });

    return () => {
      ac.abort();
      otpAbortRef.current = null;
    };
  }, [sent, activeMode, phone]);

  if (sent) {
    const targetLabel = activeMode === "phone" ? phone : email;
    const digits = codeInput.padEnd(6, " ").slice(0, 6).split("");
    const activeSlot = Math.min(codeInput.length, 5);

    return (
      <div className="step-enter-forward flex flex-1 flex-col justify-between">
        {/* Top bar with close / back */}
        <div>
          <div className="flex items-center justify-between pb-6">
            <button
              type="button"
              aria-label="Go back and change phone or email"
              onClick={() => {
                otpAbortRef.current?.abort();
                runTransition("backward", () => {
                  setCodeInput("");
                  setChangeTarget(true);
                });
              }}
              className="inline-flex size-11 -ml-2 items-center justify-center rounded-full text-ink transition-transform active:scale-90"
            >
              <X aria-hidden className="size-6" />
            </button>
            <span className="text-sm font-semibold text-pencil">
              Step 2 of 2
            </span>
          </div>

          <form
            ref={verifyFormRef}
            action={verifyAction}
            onSubmit={() => {
              otpAbortRef.current?.abort();
              otpAbortRef.current = null;
            }}
            className="space-y-6"
          >
            <input type="hidden" name="mode" value={activeMode} />
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="next" value={next} />

            <div className="space-y-1.5">
              <h1 className="font-serif text-2xl leading-snug text-ink">
                Enter code sent to{" "}
                {activeMode === "phone" ? "your phone" : "your email"}
              </h1>
              <p className="text-base font-semibold text-ink">{targetLabel}</p>
              <div className="pt-0.5 text-sm text-pencil">
                {resendSeconds > 0 ? (
                  <span>Send again in {resendSeconds} sec</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setResendSeconds(55);
                      setChangeTarget(true);
                    }}
                    className="font-semibold text-red underline decoration-red/40 decoration-2 underline-offset-4 hover:decoration-red"
                  >
                    Send code again
                  </button>
                )}
              </div>
            </div>

            {previewMessage ? (
              <div
                role="status"
                className="animate-reveal space-y-2 rounded-md border-l-4 border-ink bg-desk-deep px-4 py-3 text-sm text-ink"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {activeMode === "phone"
                      ? "Delivered text message"
                      : "Delivered sign-in code"}
                  </span>
                  {previewCode ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("success");
                        setCodeInput(previewCode);
                        requestAnimationFrame(() => {
                          verifyFormRef.current?.requestSubmit();
                        });
                      }}
                      className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
                    >
                      Tap to fill {previewCode}
                    </button>
                  ) : null}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs text-pencil">
                  {previewMessage}
                </pre>
              </div>
            ) : null}

            {/* Segmented 6-digit OTP boxes (like the third phone in the screenshot) */}
            <div className="relative pt-2">
              <label htmlFor="code" className="sr-only">
                6-digit verification code
              </label>
              <input
                ref={codeInputRef}
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                enterKeyHint="done"
                required
                autoFocus
                value={codeInput}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
                  if (clean.length > codeInput.length) {
                    triggerHaptic("selection");
                  }
                  setCodeInput(clean);
                  if (clean.length === 6) {
                    triggerHaptic("success");
                    requestAnimationFrame(() => {
                      verifyFormRef.current?.requestSubmit();
                    });
                  }
                }}
                aria-invalid={Boolean(verifyState?.error)}
                className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
              />

              <div
                aria-hidden="true"
                onClick={() => codeInputRef.current?.focus()}
                className="grid grid-cols-6 gap-2.5"
              >
                {digits.map((ch, idx) => {
                  const filled = ch.trim() !== "";
                  const isCurrent = idx === activeSlot && codeInput.length < 6;
                  return (
                    <div
                      key={idx}
                      className={`relative flex h-14 items-center justify-center rounded-md border-2 bg-paper font-mono text-xl font-semibold transition-all duration-150 ${
                        filled
                          ? "animate-chip-pop border-ink text-ink"
                          : isCurrent
                            ? "border-ink/80 text-pencil"
                            : "border-rule text-slate-400"
                      }`}
                    >
                      <span>{filled ? ch : "0"}</span>
                      <span
                        className={`absolute bottom-1.5 h-0.5 w-6 rounded-full transition-colors ${
                          isCurrent
                            ? "bg-red"
                            : filled
                              ? "bg-ink"
                              : "bg-transparent"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <FormError message={verifyState?.error} />
          </form>
        </div>

        {/* Bottom navigation bar with floating ← | → pill like the screenshot */}
        <div className="flex items-center justify-between border-t border-rule/70 pt-6 mt-10">
          <button
            type="button"
            onClick={() => {
              otpAbortRef.current?.abort();
              runTransition("backward", () => {
                setCodeInput("");
                setChangeTarget(true);
              });
            }}
            className="text-sm font-semibold text-pencil underline decoration-rule decoration-2 underline-offset-4 hover:text-ink"
          >
            {activeMode === "phone"
              ? "Use a different number"
              : "Use a different email"}
          </button>

          <div className="inline-flex items-center overflow-hidden rounded-full bg-ink text-paper shadow-paper">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => {
                otpAbortRef.current?.abort();
                runTransition("backward", () => {
                  setCodeInput("");
                  setChangeTarget(true);
                });
              }}
              className="inline-flex h-12 w-14 items-center justify-center transition-colors hover:bg-ink-soft active:scale-95"
            >
              <ArrowLeft aria-hidden className="size-5" />
            </button>
            <span aria-hidden className="h-5 w-px bg-paper/25" />
            <button
              type="button"
              aria-label="Verify code and continue"
              disabled={verifying || codeInput.length < 6}
              onClick={() => {
                triggerHaptic("medium");
                verifyFormRef.current?.requestSubmit();
              }}
              className="inline-flex h-12 w-14 items-center justify-center transition-colors hover:bg-ink-soft disabled:opacity-40 active:scale-95"
            >
              <ArrowRight aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-enter-backward flex flex-1 flex-col justify-between">
      {/* Top close button */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="Back to welcome page"
          onClick={() => triggerHaptic("light")}
          className="inline-flex size-11 -ml-2 items-center justify-center rounded-full text-ink transition-transform active:scale-90"
        >
          <X aria-hidden className="size-6" />
        </Link>
      </div>

      {/* Center illustration + warm greeting + unified input */}
      <div className="my-auto space-y-6 py-4">
        <StudyCrewIllustration />

        <div className="space-y-1.5 text-center">
          <h1 className="font-serif text-2xl leading-tight text-ink">
            <span className="block">{greeting}</span>
            <span className="block">Welcome to Homiework.</span>
          </h1>
          <p className="text-base text-pencil">
            Log in or create a new account
          </p>
        </div>

        <form
          ref={sendFormRef}
          action={sendAction}
          onSubmit={() => {
            triggerHaptic("medium");
            setCodeInput("");
            setChangeTarget(false);
            setResendSeconds(55);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="mode" value={inferredMode} />
          <input
            type="hidden"
            name="phone"
            value={inferredMode === "phone" ? identifier : ""}
          />
          <input
            type="hidden"
            name="email"
            value={inferredMode === "email" ? identifier : ""}
          />

          <div>
            <label htmlFor="identifier" className="sr-only">
              Phone number or email
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              enterKeyHint="go"
              required
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Phone number or email"
              aria-invalid={Boolean(sendState?.error)}
              className="w-full min-h-13 rounded-md border-2 border-rule bg-desk-deep/80 px-4 py-3 text-center text-base font-semibold text-ink placeholder:font-normal placeholder:text-pencil focus-visible:border-ink focus-visible:bg-paper focus-visible:outline-none transition-colors"
            />
          </div>

          <FormError message={sendState?.error} />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={sending || !identifier.trim()}
            className="w-full"
          >
            {sending ? "Sending code…" : "Continue"}
          </Button>
        </form>
      </div>

      {/* Quick test accounts footer */}
      <div className="space-y-2 border-t border-rule/70 pt-4 text-center">
        <p className="text-xs font-semibold text-pencil">
          Quick demo sign-in
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setIdentifier("+1 555 010 9999");
            }}
            className="rounded-full border border-rule bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-transform active:scale-95 hover:border-ink"
          >
            New user (+1 555 010 9999)
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setIdentifier("+1 555 010 1001");
            }}
            className="rounded-full border border-rule bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-transform active:scale-95 hover:border-ink"
          >
            Ege&apos;s account (+1 555 010 1001)
          </button>
        </div>
      </div>
    </div>
  );
}
