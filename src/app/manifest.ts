import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WanderWay — Material 3 Travel Companion",
    short_name: "WanderWay",
    description:
      "Deterministic travel planner with visible sources, honest pricing tiers, and real coordinates.",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f9ff",
    theme_color: "#006A60",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}