import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Homiework",
    short_name: "Homiework",
    description:
      "Your group takes turns picking what to learn each week, then meets up to talk it through.",
    start_url: "/home",
    display: "standalone",
    background_color: "#e4e9f2",
    theme_color: "#1a2240",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
