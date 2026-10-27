"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { triggerHaptic, type HapticStyle } from "@/lib/haptics";

type Variant = "primary" | "secondary" | "tertiary" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation select-none active:scale-[0.97] active:translate-y-[0.5px]";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-soft active:bg-slate-700",
  secondary: "border-2 border-ink/80 text-ink hover:bg-paper active:bg-desk-deep",
  tertiary: "text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink",
  danger: "bg-red text-paper hover:bg-red-deep",
};

const defaultHaptic: Record<Variant, HapticStyle> = {
  primary: "medium",
  secondary: "light",
  tertiary: "selection",
  danger: "warning",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-12 px-6 text-lg",
};

function classes(variant: Variant, size: Size, extra?: string) {
  const sizing = variant === "tertiary" ? "min-h-11 px-1 text-base" : sizes[size];
  return [base, variants[variant], sizing, extra].filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  haptic,
  onClick,
  ...props
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  haptic?: HapticStyle | false;
}) {
  return (
    <button
      type={type}
      className={classes(variant, size, className)}
      onClick={(e) => {
        if (haptic !== false) {
          triggerHaptic(haptic ?? defaultHaptic[variant]);
        }
        onClick?.(e);
      }}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  haptic,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  haptic?: HapticStyle | false;
}) {
  return (
    <Link
      className={classes(variant, size, className)}
      onClick={(e) => {
        if (haptic !== false) {
          triggerHaptic(haptic ?? defaultHaptic[variant]);
        }
        onClick?.(e);
      }}
      {...props}
    />
  );
}
