import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/theme/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROAM Video Wall",
  description: "Ford Mach-E Activation Tour: the loop of guests' films on the big screen.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
