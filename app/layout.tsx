import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Sans, Pirata_One } from "next/font/google";
import { getViewer } from "@/lib/auth";
import { ServiceWorker } from "@/components/ServiceWorker";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

const logo = Pirata_One({ weight: "400", subsets: ["latin"], variable: "--font-logo-face" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body-face" });
const data = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-data-face" });

export const metadata: Metadata = {
  title: { default: "Ink Masters", template: "%s · Ink Masters" },
  description: "Find tattoo artists near you by style, distance and price.",
  applicationName: "Ink Masters",
  appleWebApp: { capable: true, title: "Ink Masters", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android: shrink the page when the keyboard opens, so bottom buttons stay visible.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1014" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getViewer();

  return (
    <html lang="en" className={`${logo.variable} ${body.variable} ${data.variable}`}>
      <body>
        {children}
        <TabBar signedIn={!!user} isArtist={profile?.role === "artist"} />
        <ServiceWorker />
      </body>
    </html>
  );
}
