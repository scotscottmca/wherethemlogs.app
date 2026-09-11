import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./components.css";

/**
 * The public origin, for absolute URLs in metadata. Without it Next emits
 * relative canonical and Open Graph URLs and warns at build time. Overridable so
 * the container's own hostname still works before DNS cuts over.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Where Them Logs App - log file locations for Windows, macOS and Linux",
    template: "%s · Where Them Logs App",
  },
  description:
    "A searchable index of application log file locations across Windows, macOS and Linux, qualified by installer type and architecture.",
};

export const viewport: Viewport = {
  themeColor: "#111311",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
