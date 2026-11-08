import { Metadata } from "next";
import { ExploreClient } from "./_components/explore-client";

export const metadata: Metadata = {
  title: "Explore destinations — WanderWay",
  description:
    "Discover places to start your trip. Curated destinations with verified locations and interest tags.",
  openGraph: {
    title: "Explore destinations — WanderWay",
    description:
      "Discover places to start your trip. Curated destinations with verified locations and interest tags.",
    type: "website",
  },
};

/**
 * Public Explore page (Server Component).
 *
 * Exports metadata and renders the client-side Explore client component.
 * No authentication required — exploration is open to everyone.
 */
export default function ExplorePage() {
  return <ExploreClient />;
}
