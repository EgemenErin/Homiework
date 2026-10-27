import type { Profile } from "@/lib/data";

const colors: Record<string, string> = {
  ink: "bg-avatar-ink",
  red: "bg-avatar-red",
  green: "bg-avatar-green",
  plum: "bg-avatar-plum",
  ochre: "bg-avatar-ochre",
  teal: "bg-avatar-teal",
};

export const AVATAR_COLORS = ["ink", "red", "green", "plum", "ochre", "teal"] as const;

export function displayName(profile: Pick<Profile, "display_name"> | null | undefined) {
  return profile?.display_name?.trim() || "Someone";
}

export function Avatar({
  profile,
  size = "md",
  ring,
}: {
  profile: Pick<Profile, "display_name" | "avatar_color">;
  size?: "sm" | "md" | "lg";
  /** Highlighter ring for "done" */
  ring?: boolean;
}) {
  const name = displayName(profile);
  const dims = size === "sm" ? "size-8 text-sm" : size === "lg" ? "size-14 text-2xl" : "size-11 text-lg";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-paper ${dims} ${colors[profile.avatar_color] ?? colors.ink} ${ring ? "ring-4 ring-highlight" : ""}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
