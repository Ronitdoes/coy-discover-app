import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";

import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "coy. — Discover",
  description:
    "Swipe to discover people nearby. A match only happens when you both like each other.",
  applicationName: "Coy",
  appleWebApp: {
    capable: true,
    title: "Coy",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
