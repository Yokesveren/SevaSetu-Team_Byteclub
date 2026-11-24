import { createFileRoute } from "@tanstack/react-router";
import { CoimbatoreTwin } from "@/components/twin/CoimbatoreTwin";

export const Route = createFileRoute("/digital-twin")({
  head: () => ({
    meta: [
      { title: "Coimbatore 3D Digital Twin – SevaSetu" },
      { name: "description", content: "Real OpenStreetMap geography of Coimbatore with privacy-safe simulated outbreak forecasts, response planning and capacity review." },
      { property: "og:title", content: "Coimbatore 3D Digital Twin – SevaSetu" },
      { property: "og:description", content: "Explore real Coimbatore buildings and waterways in 3D, with simulated health signals and response forecasts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoimbatoreTwin,
});
