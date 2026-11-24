import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SevaSetu – Coimbatore Spatial Intelligence" },
      { name: "description", content: "SevaSetu's Coimbatore digital twin: real geography and simulated outbreak decision support." },
      { property: "og:title", content: "SevaSetu – Coimbatore Spatial Intelligence" },
      { property: "og:description", content: "See the outbreak before it spreads. Test the response before you spend it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/digital-twin" });
  },
});
