"use client";

export type HapticStyle =
  | "light"
  | "selection"
  | "medium"
  | "success"
  | "warning"
  | "error";

const PATTERNS: Record<HapticStyle, number | number[]> = {
  selection: 6,
  light: 10,
  medium: 18,
  success: [12, 40, 18],
  warning: [16, 50, 12],
  error: [24, 45, 24, 45, 24],
};

let iosSwitchLabel: HTMLLabelElement | null = null;

function ensureIosHapticSwitch(): HTMLLabelElement | null {
  if (typeof document === "undefined") return null;
  if (iosSwitchLabel && document.body.contains(iosSwitchLabel)) {
    return iosSwitchLabel;
  }
  try {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.position = "fixed";
    label.style.width = "1px";
    label.style.height = "1px";
    label.style.overflow = "hidden";
    label.style.opacity = "0";
    label.style.pointerEvents = "none";
    label.style.bottom = "0";
    label.style.left = "0";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;

    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitchLabel = label;
    return label;
  } catch {
    return null;
  }
}

/**
 * Triggers native device haptic feedback where supported (Android Vibration API
 * and iOS Safari 18+ switch haptic), respecting prefers-reduced-motion.
 */
export function triggerHaptic(style: HapticStyle = "light") {
  if (typeof window === "undefined") return;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(PATTERNS[style]);
      return;
    }
    const label = ensureIosHapticSwitch();
    label?.click();
  } catch {
    // Ignore on unsupported environments
  }
}
