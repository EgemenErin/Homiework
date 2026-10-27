import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Homiework",
    short_name: "Homiework",
    description:
      "One topic a week, picked by one of your friends. Do the homework, then meet up and talk it out.",
    start_url: "/home",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f3",
    theme_color: "#faf7f3",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
