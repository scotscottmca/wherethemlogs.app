import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./components.css";
import { Analytics } from "@/components/Consent";

/**
 * The public origin, for absolute URLs in metadata. Without it Next emits
 * relative canonical and Open Graph URLs and warns at build time. Overridable so
 * the container's own hostname still works before DNS cuts over.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Application log file locations - Where Them Logs App",
    template: "%s · Where Them Logs App",
  },
  description:
    "A searchable index of application log file locations across Windows, macOS and Linux, qualified by installer type and architecture.",
  // The image itself is drawn by app/opengraph-image.tsx, which Next wires in.
  openGraph: {
    type: "website",
    siteName: "Where Them Logs App",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#131520" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
