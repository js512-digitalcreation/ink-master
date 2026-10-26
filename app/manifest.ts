import type { MetadataRoute } from "next";

// Read by Android (install prompt, home-screen icon, splash screen) and iOS 16.4+.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ink Masters",
    short_name: "Ink Masters",
    description: "Find tattoo artists near you by style, distance and price.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0d11",
    theme_color: "#0c0d11",
    categories: ["lifestyle", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "My bookings", url: "/bookings", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Artist studio", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
